const { src, dest, series, parallel } = require("gulp");
var ts = require("gulp-typescript");
var exec = require('child_process').exec;
var browserSync = require('browser-sync').create();
const gzip = require('gulp-gzip');
var del = require('del');
var sass = require('gulp-sass'); 
const cleanCSS = require('gulp-clean-css');
const terser = require('gulp-terser');
sass.compiler = require('node-sass');
var tsProject = ts.createProject("tsconfig.json");
var replace = require('gulp-replace');

function clean() {
  return del([
    'build/**', '!build',
    'dist/**', '!dist'
  ], {force:true});
}

function styles() {
  return src('./src/scss/**/*.scss')
    .pipe(sass({
      includePaths: ['node_modules'],
      outputStyle: 'compressed'
    }))
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(dest('./build/css'))
    .pipe(cleanCSS())
    .pipe(dest("./dist/css/"))
    .pipe(gzip())
    .pipe(dest("./dist/css/"));
}

function samples() {
  return src('./src/samples/*.js')
    .pipe(dest('build/samples'))
    .pipe(dest('dist/samples'));
}

function workers() {
  return src('./src/workers/*.js')
    .pipe(dest('build/workers'))
    .pipe(dest('dist/workers'));
}

function markup() {
  return src('./src/*.html')
    .pipe(dest('build/'))
    .pipe(replace('./', 'https://unpkg.com/@netpoint-gmbh/mochaterial/'))
    .pipe(dest('dist/'));
}

function compile() {
  return tsProject.src()
    .pipe(tsProject())
    .js.pipe(dest("./src/"));
}

function rollup(cb) {
  return exec('rollup --config', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}
function minifyjs() {
  return src('./build/*.*js')
    .pipe(terser())
    .pipe(dest('dist/'))
    .pipe(gzip())
    .pipe(dest('dist/'));
}
function prepPublish() {
  // We're releasing from dist, so copy assets there...
  return src(['package.json', 'readme.md'])
  .pipe(dest('dist'));
}
function server() {
  browserSync.init({
      server: {
          baseDir: "./build"
      }
  });
}

const build = 
  series(
    clean, 
    parallel(styles, compile, samples, workers, markup, prepPublish),
    rollup,
    minifyjs
  );

exports.styles = styles;
exports.build = build;
exports.default = build;
exports.dev = server;