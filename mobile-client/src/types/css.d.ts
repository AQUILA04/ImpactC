// Type declarations for CSS and CSS Module imports used in web-targeted files.
// CSS modules (*.module.css) return a record of className strings.
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// Side-effect CSS imports (e.g. global.css via @/global.css)
declare module '*.css' {}
