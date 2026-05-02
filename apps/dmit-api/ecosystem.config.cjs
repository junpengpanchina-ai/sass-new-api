/** PM2 — deploy 时把 cwd 改成服务器上的路径（如 /root/dmit-api） */
module.exports = {
  apps: [
    {
      name: "dmit-api",
      script: "./src/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
