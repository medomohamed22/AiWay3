import crypto from 'node:crypto';
import { verifyPiAccessToken } from '../lib/pi.js';
import { ensureUser, supabase } from '../lib/supabase.js';

const PI_API_BASE = 'https://api.minepi.com/v2';
const PACKAGES = new Map([[25, 2], [70, 5], [160, 10]]);
const validId = (v, max=256) => typeof v==='string'&&v.length>0&&v.length<=max&&/^[A-Za-z0-9_-]+$/.test(v);

function verifyQuote(payment, allowExpired=false) {
  const quote=String(payment?.metadata?.quote||''),parts=quote.split('.');
  if(parts.length!==2){
    const legacyCredit=Number(payment?.metadata?.credit),legacyAmounts=new Map([[25,0.2],[70,0.5],[160,1]]),legacyAmount=legacyAmounts.get(legacyCredit);
    if(allowExpired&&legacyAmount===Number(payment?.amount)&&payment?.direction==='user_to_app')return {credit:legacyCredit,usd:PACKAGES.get(legacyCredit),piPrice:PACKAGES.get(legacyCredit)/legacyAmount,amountPi:legacyAmount,expiresAt:0};
    return null;
  }
  const [payload,signature]=parts;
  const expected=crypto.createHmac('sha256',process.env.PI_API_KEY||'').update(payload).digest('hex');
  if(signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
  let parsed;try{parsed=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch{return null}
  const credit=Number(parsed.credit),usd=Number(parsed.usd),piPrice=Number(parsed.piUsd),amountPi=Number(parsed.amountPi),expiresAt=Number(parsed.expiresAt);
  if(PACKAGES.get(credit)!==usd||!allowExpired&&Date.now()>expiresAt||Number(payment.amount)!==amountPi||payment.direction!=='user_to_app')return null;
  return {credit,usd,piPrice,amountPi,expiresAt};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const apiKey=process.env.PI_API_KEY?.trim();
  if(!apiKey)return res.status(500).json({error:'PI_API_KEY is missing.'});
  const {action,paymentId,txid}=req.body||{};
  if(!['approve','complete'].includes(action)||!validId(paymentId)||action==='complete'&&!validId(txid,512))return res.status(400).json({error:'Invalid payment request.'});
  try{
    const {user:piUser}=await verifyPiAccessToken(req);
    const dbUser=await ensureUser(piUser);
    const inspection=await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}`,{headers:{Authorization:`Key ${apiKey}`,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
    const before=await inspection.json().catch(()=>({}));
    const quote=verifyQuote(before,action==='complete'&&before.status?.developer_approved===true);
    if(!inspection.ok||before.user_uid!==piUser.uid||!quote)return res.status(400).json({error:'Payment user, amount, or signed price quote is invalid/expired.'});
    const response=await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}/${action}`,{method:'POST',headers:{Authorization:`Key ${apiKey}`,Accept:'application/json','Content-Type':'application/json'},body:action==='complete'?JSON.stringify({txid}):'{}',signal:AbortSignal.timeout(15000)});
    const payment=await response.json().catch(()=>({}));
    if(!response.ok)return res.status(response.status<500?response.status:502).json({error:payment.error_message||payment.message||`Pi ${action} failed.`});
    await supabase('payments?on_conflict=pi_payment_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({
      user_id:dbUser.id,pi_payment_id:paymentId,txid:payment.transaction?.txid||txid||null,status:action==='complete'?'completed':'approved',
      amount_pi:quote.amountPi,amount_usd:quote.usd,pi_usd_rate:quote.piPrice,coins:quote.credit,network:payment.network||null,
      raw_payment:payment,completed_at:action==='complete'?new Date().toISOString():null
    })});
    if(action==='complete')payment.coin_balance=await supabase('rpc/credit_completed_payment',{method:'POST',body:JSON.stringify({p_pi_payment_id:paymentId})});
    return res.status(200).json(payment);
  }catch(error){return res.status(error.status||502).json({error:error.message||'Payment service failed.'})}
}
