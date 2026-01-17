export default async function handler(req,res){
res.setHeader("Access-Control-Allow-Origin","https://www.checkdet.dk");
res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type");
if(req.method==="OPTIONS")return res.status(200).end();
if(req.method!=="POST")return res.status(405).json({error:"Only POST"});

try{
const AWS=(await import("aws-sdk")).default;
const {image,consent,selections}=req.body||{};
if(!image||consent!==true){
  return res.status(200).json({faceDetected:false});
}

const rek=new AWS.Rekognition({
  region:process.env.AWS_REGION,
  accessKeyId:process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY
});

const base64=image.replace(/^data:image\/\w+;base64,/,"");
const buf=Buffer.from(base64,"base64");
const r=await rek.detectFaces({Image:{Bytes:buf}}).promise();
if(!(r.FaceDetails||[]).length){
  return res.status(200).json({faceDetected:false});
}

const prompt=`
Du er en SENIOR ansigtsstylist.

Brugeren har aktivt valgt disse fokusområder og ønsker
EKSTRA ÆRLIG og KONKRET feedback netop her:
${(selections?.focus||[]).map(f=>"- "+f).join("\n")}

REGLER:
- Ingen kønsantagelser.
- Ingen sukkersød tone.
- Vælg og fravælg – forklar hvorfor.
- Giv handlingsrettede råd.

Strukturér svaret i 7 afsnit:
1. Helhedsindtryk
2. Udtryk
3. Formål
4. Konkrete stylingforslag
5. Prioriterede fokusområder
6. Hvad der bør undgås
7. Alternativ tilgang

Skriv som en erfaren stylist – professionelt og direkte.
`.trim();

const baseUrl=process.env.VERCEL_URL
?`https://${process.env.VERCEL_URL}`
:`http://${req.headers.host}`;

const ask=await fetch(`${baseUrl}/api/ask`,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({question:prompt,temperature:0.7})
});

const data=await ask.json();
return res.status(200).json({
  faceDetected:true,
  answer:data.answer
});

}catch(e){
return res.status(500).json({error:"ansigtsstyling_failed"});
}}
