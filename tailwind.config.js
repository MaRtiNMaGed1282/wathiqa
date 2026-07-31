module.exports = {
  content: [
    "./frontend/pages/**/*.html",
    "./frontend/components/**/*.html",
    "./frontend/assets/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#293040",
        secondary: "#3B475C",
        accent: "#D3AC2B",
        light: "#EEE5D9",
        beige: "#D2B68A",
        darkBlue: "#222D52",
        white: "#FDFFFF",
      },
      fontFamily: {
        cairo: ["Cairo", "sans-serif"],
      },
    },
  },
  plugins: [],
};
