import { allowMethods, json } from './_lib.js';
export default async function handler(req,res){if(!allowMethods(req,res,['POST']))return;return json(res,410,{error:'Use the secure payment completion flow to submit an app'})}
