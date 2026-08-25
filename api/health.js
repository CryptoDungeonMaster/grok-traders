"use strict";
const { desk, send } = require("./_desk");

module.exports = async function handler(req, res) {
  const state = await desk();
  send(res, {
    ok: true,
    live: state.live,
    status: state.board.status,
    checkedAt: state.board.updatedAt,
    fills: Object.values(state.fillsBySeat).reduce((n, f) => n + f.length, 0)
  });
};
