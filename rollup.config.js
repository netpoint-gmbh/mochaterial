import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

export default [{
  input: 'src/mochaterial.js',
  output: {
    file: 'build/mochaterial.mjs',
    name: 'Mochaterial',
    format: 'esm',
    compact: true,
    paths: {
      '@material/switch/index': 'https://unpkg.com/@material/switch@2.0.0/index.js?module',
      '@material/top-app-bar/index': 'https://unpkg.com/@material/top-app-bar@2.0.0/index.js?module',
      // MDCDrawer requires focus-trap 5, which isn't loadable as an es6 module yet, so we must bundle MDCDrawer...
      // Reference Issue: https://github.com/davidtheclark/focus-trap/issues/30
      //'@material/drawer/index': 'https://unpkg.com/@material/drawer@2.0.0/index.js?module' 
    }
  },
  external: [
    'https://unpkg.com/stacktrace-js@2.0.0/dist/stacktrace.min.js',
    '@material/switch/index',
    '@material/top-app-bar/index',
    //'@material/drawer/index'
  ],

  plugins: [
    resolve(),
    commonjs({
      include: [
        // node packages for focus-trap and its dependencies
        'node_modules/focus-trap/**', 'node_modules/xtend/**', 'node_modules/tabbable/**',
      ],
    })
  ]
}, {
  input: 'src/mochaterial.js',
  output: {
    file: 'build/umd.mochaterial.js',
    name: 'UMD',
    format: 'umd',
    compact: true,
  },
  external: [
    'https://unpkg.com/stacktrace-js@2.0.0/dist/stacktrace.min.js',
  ],

  plugins: [
    resolve(),
    commonjs({
      include: [
        // node packages for focus-trap and its dependencies
        'node_modules/focus-trap/**', 'node_modules/xtend/**', 'node_modules/tabbable/**',
      ],
    })
  ]
}];