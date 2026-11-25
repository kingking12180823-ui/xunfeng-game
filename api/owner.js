// 前端查詢：目前瀏覽器是不是站長
const { isOwner } = require("./_owner.js");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ owner: await isOwner(req) });
};
