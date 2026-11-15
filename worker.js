importScripts('vendor/potrace.js','trace.js?v=6');
onmessage=async e=>{const {ticket,data,w,h,options}=e.data;try{postMessage({ticket,result:await VectorTrace.trace(data,w,h,options)});}catch(err){postMessage({ticket,error:err.message||'Calcul impossible. Essayez une image plus simple.'});}};
