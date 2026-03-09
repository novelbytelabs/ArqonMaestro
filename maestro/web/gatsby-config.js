module.exports = {
  siteMetadata: {
    siteUrl: "https://novelbytelabs.github.io/ArqonMaestro/",
    title: "Arqon Maestro | Voice-first control layer",
    description:
      "Arqon Maestro is a voice-first control layer for the Arqon ecosystem.",
    keywords: "arqon, arqon-maestro, voice, code, productivity",
  },
  plugins: [
    "gatsby-plugin-postcss",
    "gatsby-plugin-image",
    "gatsby-plugin-layout",
    {
      resolve: "gatsby-plugin-sharp",
      options: {
        defaults: {
          quality: 90,
        },
      },
    },
    "gatsby-transformer-sharp",
    "gatsby-plugin-react-helmet",
    "gatsby-plugin-sitemap",
    {
      resolve: "gatsby-plugin-web-font-loader",
      options: {
        typekit: {
          id: "rwt5gge",
        },
      },
    },
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        icon: "src/images/icon.png",
      },
    },
    "gatsby-plugin-mdx",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: "./src/images/",
      },
      __key: "images",
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "pages",
        path: "./src/pages/",
      },
      __key: "pages",
    },
  ],
};
