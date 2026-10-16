// 沿用现有分类编号，避免改变新增装饰与模型工作台的数据约定。
export const BEDROOM_PAGE=6;
const categories={
 bed:6,bedside:6,'bed-bench':6,'dressing-mirror':6,'dressing-stool':6,'dressing-zone':6,
 'gaming-zone':1,'listening-zone':1,'album-zone':1,'guitar-amp':1,'reading-books':1,
 'cat-bed':4,'dog-bed':4,'cat-toy':4,
 'living-sofa':3,'living-table':3,'living-desk':3,'living-record-cabinet':3,
 'desk-chair':3,'piggy-lounge-zone':3,'reading-chair':3,'reading-table':3,
 'zakery-chair':3,'dining-table':3,'collection-cabinet':3,
};
export function builtinCategory(id){
 const key=id.replace(/^r[0-3]-/,'');
 if(key.startsWith('dining-chair-'))return 3;
 return categories[key]??0;
}
export function furniturePages(decorPages){return decorPages.map((name,i)=>i===3?'沙发与桌椅':name).concat('卧室家具')}
