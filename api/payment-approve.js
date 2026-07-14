import { allowMethods, assertPiPayment, db, handleError, json, piRequest, rateLimit, requireUser } from './_lib.js';

const PLANS={app_submission:{amount:1},feature_3_days:{amount:10,days:3},feature_14_days:{amount:20,days:14},feature_30_days:{amount:30,days:30}};

export default async function handler(req,res){
 if(!allowMethods(req,res,['POST']))return;
 try{
  const user=await requireUser(req);await rateLimit(req,{key:'payment-approve',limit:12,windowSeconds:300,userId:user.id});
  const paymentId=String(req.body?.paymentId||'').trim();
  if(!paymentId)return json(res,400,{error:'Missing payment id'});
  const payment=await piRequest(`/v2/payments/${encodeURIComponent(paymentId)}`);
  const purpose=String(payment?.metadata?.purpose||'');const plan=PLANS[purpose];
  if(!plan)return json(res,400,{error:'Unsupported payment purpose'});
  const appId=purpose==='app_submission'?null:String(payment?.metadata?.appId||'');
  assertPiPayment(payment,{paymentId,userUid:user.pi_uid,amount:plan.amount,purpose,appId:appId||undefined});
  if(appId){const {data:app}=await db().from('apps').select('id,status').eq('id',appId).eq('owner_id',user.id).maybeSingle();if(!app||app.status!=='published')return json(res,400,{error:'Only your published apps can be promoted'})}
  const approved=payment.status?.developer_approved?payment:await piRequest(`/v2/payments/${encodeURIComponent(paymentId)}/approve`,{method:'POST'});
  assertPiPayment(approved,{paymentId,userUid:user.pi_uid,amount:plan.amount,purpose,appId:appId||undefined});
  const {error}=await db().from('payments').upsert({user_id:user.id,app_id:appId||null,payment_id:paymentId,purpose,amount_pi:plan.amount,status:'approved',raw_response:approved},{onConflict:'payment_id'});
  if(error)throw error;return json(res,200,{approved:true});
 }catch(e){return handleError(e,res,'Unable to approve payment')}
}
