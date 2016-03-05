var
gulp            = require('gulp'),
sass            = require('gulp-sass'),
shell           = require('gulp-shell'),
data            = require('gulp-data'),
nunjucksRender  = require('gulp-nunjucks-render'),
browserSync     = require('browser-sync'),
file            = require('gulp-file'),
plumber         = require('gulp-plumber'),
csv2json        = require('gulp-csv2json'),
rename          = require('gulp-rename'),
gulpFn          = require('gulp-fn'),
colors          = require('colors'),
minimist        = require('minimist'),
packagejson     = require('./package.json');

var argv = minimist(process.argv.slice(2));

var processJSONOptions = {
  diff   : false || argv.diff
};

var COL_NAME_MAP = {
  'Publication Name'      : 'title',
  'Open vs. Closed Access': 'access',
  'Organization'          : { value : 'organization', slugify : true },
  'Authors'               : 'authors',
  'Image or Screenshot'   : 'cover_image',
  'Published On'          : 'paper_date',
  'Submitted On'          : 'submission_date',
  'Link to download'      : 'url',
  'Sector'                : { value : 'sector', slugify : true },
  'Region'                : { value : 'region', slugify : true },
  'Publication Type'      : { value : 'type', slugify : true },
  'GitHub Repository'     : 'github',
  'Abstract'              : 'abstract',
  'Content URL'           : 'html_content',
  'Internal Subset'       : 'subset',
  'Tags'                  : 'tags',
  'Innovation'            : { parent : 'taxonomy', value : 'category' },
  'Methodology'           : { parent : 'taxonomy', value : 'methodology' },
  'Objective'             : { parent : 'taxonomy', value : 'objective' },
  'Dataset Name'          : { parent : 'datasets', value : 'name', delimiter : ';', many : true },
  'Dataset URL'           : { parent : 'datasets', value : 'url', delimiter : ';', many : true },
  'Related Content Title' : { parent : 'related_content', value : 'title', delimiter : ';', many : true },
  'Related Content URL'   : { parent : 'related_content', value : 'url', delimiter : ';', many : true },
  'PDF URL'               : { parent : 'direct_download', value : 'pdf' },
  'Word URL'              : { parent : 'direct_download', value : 'word' },
  'Mobi URL'              : { parent : 'direct_download', value : 'mobi' },
  'ePub URL'              : { parent : 'direct_download', value : 'epub' },
  'Other URL'             : { parent : 'direct_download', value : 'other', children : ['name', 'url'], delimiter : ';' }
};

gulp.task('browserSync', function() {
  browserSync({
    server: {
      baseDir: 'public'
    },
    open: false
  })
})

gulp.task('sass', function() {
  return gulp.src('source/sass/**/*.scss')
  .pipe(sass().on('error', sass.logError))
  .pipe(gulp.dest('public/css'))
  .pipe(browserSync.reload({
    stream: true
  }))
});

gulp.task('img', function() {
  return gulp.src('source/img/**/*')
  .pipe(plumber())
  .pipe(gulp.dest('public/img'))
  .pipe(browserSync.stream());
});

gulp.task('js', function() {
  return gulp.src(['node_modules/govlab-styleguide/js/**/*', 'source/js/**/*'])
  .pipe(plumber())
  .pipe(gulp.dest('public/js'))
  .pipe(browserSync.stream());
});

// Nunjucks
gulp.task('nunjucks', function() {

  var options = {
    path: 'source/templates',
    ext: '.html'
  };

  return gulp.src('source/templates/**/*.+(html|nunjucks)')
  .pipe(plumber())
  .pipe(data(function() {
    return require('./source/data/data.json')
  }))
  .pipe(nunjucksRender(options))
  .pipe(gulp.dest('public'))
  .pipe(browserSync.reload({
    stream: true
  }))
});

gulp.task('deploy', ['sass', 'nunjucks', 'js', 'img'], shell.task([
  'git subtree push --prefix public origin gh-pages'
  ])
);


function slugify(t) {
  return t.toString().toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-')
  .replace(/^-+/, '')
  .replace(/-+$/, '');
}

function processJSON ( file ) {
  'use strict';
  var _json = JSON.parse(file.contents.toString());
  var _jsonOut = [];
  for (var i in _json) {
    _jsonOut[i] = {};
    _jsonOut[i].id = i;

    if (processJSONOptions.diff) {
      console.log('{   '.inverse);
      for (var y in _jsonOut[i]) {
        console.log(('++++ ' + y + ' : ' + _jsonOut[i][y]).green);
      }
    }

    for (var j in _json[i]) {

      if (j in COL_NAME_MAP) {
        var v = COL_NAME_MAP[j];

        if (typeof v === 'object') {
          if ('parent' in v) {
            if (!(v.parent in _jsonOut[i])) {
              _jsonOut[i][v.parent] = v.many ? [] : {};
            }

            if (v.many) {

              if (processJSONOptions.diff) {
                console.log(('---- ' + j + ' : ' + _json[i][j]).red);
                console.log(('++++ ' + v.parent + ' : [ ').green);
              }

              var _split = _json[i][j].split(v.delimiter);

              for (var s in _split) {
                if (_jsonOut[i][v.parent].length == 0) {
                  let a = v.value;
                  let b = {};
                  b[a]  = '';
                  _jsonOut[i][v.parent][s] = b;
                }
                _jsonOut[i][v.parent][s][v.value] = _split[s];

                if (processJSONOptions.diff) {
                  console.log(('++++ ++++ { ' + v.value + ' : ' + _split[s] + ' }').green);
                }
              }

              if (processJSONOptions.diff) {
                console.log(('++++ ]').green);
              }

            } else {
              _jsonOut[i][v.parent][v.value] = _json[i][j];

              if (processJSONOptions.diff) {
                console.log(('---- ' + j + ' : ' + _json[i][j]).red);
                console.log(('++++ ' + v.parent + '\n++++ ++++ : { ' + v.value + ' : ' + _jsonOut[i][v.parent][v.value] + ' }').green);
              }
            }
          } else {
            if (v.slugify) {
              _json[i][j] = slugify(_json[i][j]);
            }
            _jsonOut[i][v.value] = _json[i][j];
          }

        } else {
          _jsonOut[i][v] = _json[i][j];

          if (processJSONOptions.diff) {
            console.log(('---- ' + j + ' : ' + _json[i][j]).red);
            console.log(('++++ ' + v + ' : ' + _jsonOut[i][v]).green);
          }
        }
      }
    }

    if (processJSONOptions.diff) {
      console.log('}   '.inverse);
    }

  }
  var out = JSON.stringify(_jsonOut);
  file.contents = new Buffer(out);
}

gulp.task('json', function() {
  var options = {};
  return gulp.src('support/data/**.csv')
  .pipe(csv2json(options))
  .pipe(gulpFn(processJSON))
  .pipe(rename(function (path) {
    path.extname = ".json"
  }))
  .pipe(gulp.dest('data'))
});


gulp.task('default', ['browserSync', 'sass', 'nunjucks', 'js', 'img'], function (){
  gulp.watch('source/sass/**/*.scss', ['sass']);
  gulp.watch('source/templates/**/*.html', ['nunjucks']);
  gulp.watch('source/img/**/*', ['img']);
  gulp.watch('source/js/**/*', ['js']);
});