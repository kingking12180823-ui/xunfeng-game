const B=require('./bazi-engine.js');
const W=B.WX;
function run(chs,label,expect,pillars){ // chs: 依年→時順序（已排除日主）
  const its=chs.map((c,i)=>B.item(c,"p"+i)); const st=its.filter(x=>x.gan), br=its.filter(x=>!x.gan);
  B.applyHe(st,pillars||[]); B.applyHe(br,pillars||[]);
  const f=B.flow(its); const got={}; its.forEach(x=>got[x.ch]=f.score[x.e]);
  const ok=Object.entries(expect).every(([k,v])=>Math.abs(got[k]-v)<1e-9);
  console.log(ok?"OK ":"NG ",label,JSON.stringify(got),"expect",JSON.stringify(expect));
}
// 書寫順序為 時日月年；轉為年→時並去掉日主
run(["戊","戊","甲"],"甲己戊戊",{甲:-2,戊:2});
run(["己","甲","甲"],"甲壬甲己",{甲:3,己:0.5});
run(["乙","己","壬"],"壬甲己乙",{乙:2,己:-2});
run(["亥","酉","戌","午"],"午戌酉亥(年午…時亥? 依例)",{午:2,戌:4,酉:5,亥:2});
run(["午","戌","酉","亥"],"午戌酉亥 年→時",{午:2,戌:4,酉:5,亥:2});
run(["辰","子","卯","酉"],"辰酉子卯(不相鄰)",{辰:2,酉:3,子:3,卯:4});
run(["午","丑","申","亥"],"午丑申亥",{午:2,丑:3,申:3,亥:4});
run(["庚","丁","壬"],"庚丁壬",{庚:2,丁:0.5,壬:3});
run(["甲","丁","己"],"甲丁己",{甲:2,丁:3,己:2});
run(["巳","戌","亥","子"],"巳戌亥子",{亥:0,戌:0,巳:0});
run(["申","午","卯","亥"],"亥卯午申：申必受傷",{});
const r=(()=>{const its=["申","午","卯","亥"].map((c,i)=>B.item(c,"p"+i));B.applyHe(its,[]);return B.flow(its)})();console.log("申金分數",r.score[3],"(應<0)");
