// 客厅与卧室共享同一套数量规则，墙饰也计入名额。
export const decorLimit=room=>Number(room)===3?30:12;
