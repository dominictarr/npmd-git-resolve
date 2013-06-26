var mkdirp = require('mkdirp')
var http = require('https')
var fs = require('fs')
var crypto = require('crypto')
var tar = require('tar')
var os = require('os')
var zlib = require('zlib')
var fstream = require('fstream')
var path = require('path')
var request = require('request')

function toGithubDownload (repo) {
  //git://github.com/substack/sockjs-client.git#browserify-npm
  //https://github.com/isaacs/readable-stream/archive/master.tar.gz
  //https://codeload.github.com/substack/node-browser-resolve/tar.gz/dir-replace
  if(/^http/.test(repo)) return repo

  var m = /^git:\/\/github.com\/([^#]+?).git(?:#(.*))?$/.exec(repo)

  if(m) return 'https://codeload.github.com/' + m[1] + '/tar.gz/' + m[2]
  return null
}

var resolve = module.exports = function (url, cb) {
  var hash, n = 2
  var tmp = path.join(os.tmpdir(), ''+ Date.now() + Math.random())
  var tmpFile = path.join(tmp, 'package.tgz')
  var tmpDir = path.join(tmp, 'package')
  var _url = toGithubDownload(url)
  mkdirp(tmp, function () {
    var res = request.get(_url)
    res
      .pipe(zlib.createGunzip())
      .on('error', function (err) {
        n = -1; cb(err)
      })
      .pipe(tar.Extract({path: tmp}))
      .on('close', next)

    var hash = crypto.createHash('sha')
    res.on('data', function (b) {
      hash.update(b)
    })
    .on('end', next)

      function next () {
        if(--n) return
        var h = hash.digest('hex')

        fs.readdir(tmp, function (err, ls) {
          if(err) return cb(err)
          var source  = path.join(tmp, ls[0])
          var dest    = path.join(tmp, 'package')
          var tarball = path.join(tmp, 'package.tgz')

          fs.rename(source, dest, function (err) {
            if(err) return cb(err)
            var n = 2, pkg
            fstream.Reader({path: dest, type: 'Directory'})
              .pipe(tar.Pack({path: dest}))
              .pipe(zlib.createGzip())
              .on('error', function (err) {
                n = -1
                cb(err)
              })
              .pipe(fs.createWriteStream(tarball))
              .on('finish', next)
            
            fs.readFile(path.join(tmp, 'package', 'package.json'), 'utf8',
              function (err, file) {
                try { pkg = JSON.parse(file) }
                catch (err) { return cb(err) }
                next()
              })

            function next () {
              if(--n) return
              var cache = path.join(process.env.HOME, '.npm', pkg.name, h)
              fs.rename(tmp, cache, function (err) {
                pkg.shasum = h
                pkg.from = url
                cb(err, pkg)
              })
            }
          })
        })
      }
  
  })
}


if(!module.parent) {
  var url = "https://codeload.github.com/substack/node-browser-resolve/tar.gz/dir-replace"
  url = 'https://github.com/isaacs/readable-stream/archive/master.tar.gz'
//  url = 'git://github.com/substack/sockjs-client.git#browserify-npm'
  resolve(url, console.error)
}


