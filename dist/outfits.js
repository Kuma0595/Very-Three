// 穿搭只保存款式编号与配色；按成员编号区分共用卧室里的两个人。
export const OUTFIT_SLOTS={top:'上衣',bottom:'下装',shoes:'鞋子',accessory:'配饰'};
export const OUTFIT_ITEMS={
 top:[['original','原配上衣','保留每个人的标志细节'],['tee','日常短袖','轻松一点，今天也自在'],['hoodie','连帽卫衣','把自己裹进柔软里'],['jacket','开襟外套','内搭与外套的小层次'],['shirt','翻领衬衫','出门听一场喜欢的演出']],
 bottom:[['original','原配长裤','熟悉又舒服的日常'],['trousers','直筒长裤','利落的裤线与口袋'],['shorts','休闲短裤','留一点夏天的轻盈']],
 shoes:[['original','原配便鞋','小屋里熟悉的脚步'],['sneakers','拼色运动鞋','奶油鞋底与系带'],['boots','短筒靴','厚底和短靴筒']],
 accessory:[['original','原配配饰','保留原有眼镜或耳机'],['none','不戴配饰','清清爽爽地回家'],['glasses','圆框眼镜','给今天换个视角'],['headphones','头戴耳机','带上自己的背景音乐'],['beanie','针织帽','一小团软软的温暖'],['scarf','围巾','围住一点喜欢的颜色']]
};
export const OUTFIT_COLORS=[['#383540','墨黑'],['#657087','雾灰蓝'],['#454351','炭灰'],['#f4e6d9','奶油'],['#bda77e','麦芽'],['#745277','葡萄紫'],['#608c8e','青绿'],['#a4bfae','鼠尾草'],['#c591a3','莓果粉'],['#a6becd','晴空蓝'],['#c8bfdc','浅薰衣草'],['#d7ac65','蜂蜜']];
const colors=new Set(OUTFIT_COLORS.map(([value])=>value));
export const outfitRoom=index=>index===3?2:index;
export function defaultOutfit(index=0){return {top:{style:'original',color:['#383540','#bda77e','#745277','#608c8e'][index]??'#383540'},bottom:{style:'original',color:index===2?'#454351':'#657087'},shoes:{style:'original',color:'#f4e6d9'},accessory:{style:'original',color:'#383540'}}}
export function normalizeOutfit(value,index=0){
 const fallback=defaultOutfit(index),result={};
 for(const slot of Object.keys(OUTFIT_SLOTS)){const part=value?.[slot];result[slot]={style:OUTFIT_ITEMS[slot].some(([id])=>id===part?.style)?part.style:fallback[slot].style,color:colors.has(part?.color)?part.color:fallback[slot].color}}
 return result;
}
export function outfitFromConfig(config,index){return normalizeOutfit(config?.outfits?.[index],index)}
export function mergeOutfit(config,index,outfit){
 if(!Number.isInteger(index)||index<0||index>3)throw Error('请选择自己的角色');
 const next=structuredClone(config);
 if(!next||typeof next!=='object'||Array.isArray(next)||!Array.isArray(next.items)||!next.colors||typeof next.colors!=='object'||Array.isArray(next.colors))throw Error('房间配置尚未完整读取，请稍后重试');
 const previous=next.outfits;next.outfits={...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{}),[index]:normalizeOutfit(outfit,index)};
 if(new TextEncoder().encode(JSON.stringify(next)).length>10000)throw Error('房间布置内容较多，暂时无法保存穿搭');
 return next;
}
