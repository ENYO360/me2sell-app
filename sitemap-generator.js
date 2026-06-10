require("@babel/register")({
  presets: [
    "@babel/preset-env",
    "@babel/preset-react"
  ],
});

const router = require("./src/App").default;
const Sitemap = require("react-router-sitemap").default;

new Sitemap(router)
  .build("https://me2sell.online")
  .save("./public/sitemap.xml");