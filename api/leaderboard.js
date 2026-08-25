"use strict";
const { desk, send } = require("./_desk");

module.exports = async function handler(req, res) {
  const state = await desk();
  send(res, state.board);
};
