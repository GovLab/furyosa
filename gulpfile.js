var
fs              = require('fs'),
gulp            = require('gulp'),
sass            = require('gulp-sass'),
shell           = require('gulp-shell'),
data            = require('gulp-data'),
nunjucksRender  = require('gulp-nunjucks-render'),
browserSync     = require('browser-sync'),
plumber         = require('gulp-plumber'),
csv2json        = require('gulp-csv2json'),
rename          = require('gulp-rename'),
gulpFn          = require('gulp-fn'),
colors          = require('colors'),
minimist        = require('minimist'),
researchjson    = require('./data/research.json'),
File            = require('vinyl'),
md5             = require('blueimp-md5');
packagejson     = require('./package.json');

var argv = minimist(process.argv.slice(2));

var cliOptions = {
  diff      : false || argv.diff,
  verbose   : false || argv.verbose
};

var COL_NAME_MAP = {
  'Publication Name'      : 'title',
  'Open vs. Closed Access': 'access',
  'Organization'          : { value : 'organization', slugify : true },
  'Authors'               : { value : 'authors', children : ['*'], delimiter : ',' },
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
  'Subset'                : 'subset',
  'Tags'                  : 'tags',
  'Innovation'            : { parent : 'taxonomy', value : 'category', children : ['*'], delimiter : ',' },
  'Methodology'           : { parent : 'taxonomy', value : 'methodology', children : ['*'], delimiter : ',' },
  'Objective'             : { parent : 'taxonomy', value : 'objective', children : ['*'], delimiter : ',' },
  'Dataset Name'          : { parent : 'datasets', value : 'name', many : true, delimiter : ';' },
  'Dataset URL'           : { parent : 'datasets', value : 'url', many : true, delimiter : ';' },
  'Related Content Title' : { parent : 'related_content', value : 'title', many : true, delimiter : ';' },
  'Related Content URL'   : { parent : 'related_content', value : 'url', many : true, delimiter : ';' },
  'PDF URL'               : { parent : 'direct_download', value : 'pdf' },
  'Word URL'              : { parent : 'direct_download', value : 'word' },
  'Mobi URL'              : { parent : 'direct_download', value : 'mobi' },
  'ePub URL'              : { parent : 'direct_download', value : 'epub' },
  'Other URL'             : { parent : 'direct_download', value : 'other', children : ['url', 'name'], delimiter : ' ' }
};

function slugify(t) {
  return t.toString().toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-')
  .replace(/^-+/, '')
  .replace(/-+$/, '');
}

function populateChildren(out, content, val, index) {
  if ('children' in val) {
    var _s = content.split(val.delimiter);
    if ('parent' in val) {
      out[index][val.parent][val.value] = val.children[0] === '*' ? [] : {};
    } else {
      out[index][val.value] = val.children[0] === '*' ? [] : {};
    }

    if (val.children[0] === '*') {
      for (var s in _s) {
        if ('parent' in val) {
          out[index][val.parent][val.value].push(_s[s].trim());
        } else {
          out[index][val.value].push(_s[s].trim());
        }
      }
    } else {
      for (var k in val.children) {
        if (k < _s.length) {
          if ('parent' in val) {
            out[index][val.parent][val.value][val.children[k]] = _s[k].trim();
          } else {
            out[index][val.value][val.children[k]] = _s[k].trim();
          }
        }
      }
    }
  } else {
    if ('parent' in val) {
      out[index][val.parent][val.value] = content;
    } else {
      out[index][val.value] = content;
    }
  }
  return out;
}

function processJSON ( file ) {
  'use strict';
  var _json = JSON.parse(file.contents.toString());
  var _jsonOut = [];
  for (var i in _json) {
    _jsonOut[i] = {};
    _jsonOut[i].id = md5(i.toString());

    for (var j in _json[i]) {

      if (j in COL_NAME_MAP) {
        var v = COL_NAME_MAP[j];

        if (typeof v === 'object') {

          var content = _json[i][j];

          if (v.slugify) {
            content = slugify(content);
          }

          if ('parent' in v) {
            if (!(v.parent in _jsonOut[i])) {
              _jsonOut[i][v.parent] = v.many ? [] : {};
            }

            if (v.many) {
              var _split = content.split(v.delimiter);

              for (var s in _split) {
                if (_jsonOut[i][v.parent].length == 0) {
                  let a = v.value;
                  let b = {};
                  b[a]  = '';
                  _jsonOut[i][v.parent][s] = b;
                }
                _jsonOut[i][v.parent][s][v.value] = _split[s].trim();
              }
            }
          }

          _jsonOut = populateChildren(_jsonOut, content, v, i);

        } else {
          _jsonOut[i][v] = _json[i][j];
        }
      }
    }
  }
  var out = JSON.stringify(_jsonOut);
  file.contents = new Buffer(out);
}

function generateVinyl(data, basePath, templatePath, filePrefix, fileSuffix) {
  var es = require('event-stream');
  var templatefile = fs.readFileSync(templatePath);
  var files = [];

  if (filePrefix === undefined) {
    filePrefix = '';
  }

  if (fileSuffix === undefined) {
    fileSuffix = '.html';
  }

  for (d in data) {
    var f = new File({
      cwd: '.',
      base: basePath,
      path: basePath + filePrefix + data[d].id + '--' + slugify(data[d].title) + fileSuffix,
      contents: templatefile
    });
    files.push(f);
  }

  return require('stream').Readable({ objectMode: true }).wrap(es.readArray(files));
}


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
gulp.task('nunjucks', ['generateResearchFiles'], function() {

  var options = {
    path: 'source/templates',
    ext: '.html'
  };

  return gulp.src('source/templates/**/*.+(html|nunjucks)')
  .pipe(plumber())
  .pipe(data(function(file) {
    for (var i in researchjson) {
      if (file.path.indexOf(researchjson[i].id) >= 0) {
        if (cliOptions.verbose) {
          console.log('Found Generated Template',  file.path, ': using ', JSON.stringify(researchjson[i]).green);
        }
        return researchjson[i];
      }
    }
    return require('./data/data.json');
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


gulp.task('generateResearchFiles', function() {
  return generateVinyl(researchjson, './source/templates/repo/', './source/templates/paper-template.html')
  .pipe(gulp.dest('source/templates/repo'))
});


gulp.task('default', ['browserSync', 'sass', 'nunjucks', 'js', 'img'], function (){
  gulp.watch('source/sass/**/*.scss', ['sass']);
  gulp.watch('source/templates/**/*.html', ['nunjucks']);
  gulp.watch('source/img/**/*', ['img']);
  gulp.watch('source/js/**/*', ['js']);
});