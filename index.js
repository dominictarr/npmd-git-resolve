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
var os = require('osenv')

function toGithub (repo) {
  //git://github.com/substack/sockjs-client.git#browserify-npm
  //https://github.com/isaacs/readable-stream/archive/master.tar.gz
  //https://codeload.github.com/substack/node-browser-resolve/tar.gz/dir-replace
  //git+ssh://git@github.com:isaacs/readable-stream.git
  if(/^http/.test(repo)) return repo

  var m = /^(?:(?:git:\/\/github.com\/)|(?:git\+ssh:\/\/git@github.com:))?([^#]+?)(?:\.git)?(?:#(.*))?$/.exec(repo)

  if(m) return 'https://codeload.github.com/' + m[1] + '/tar.gz/' + (m[2] || 'master')
  return null
}

var resolve = module.exports = function (url, opts, cb) {
  if(!cb)
    cb = opts, opts = {}
  var tmpdir = opts.tmp || os.tmpdir()
  var hash, n = 2
  var tmp = path.join(tmpdir, ''+ Date.now() + Math.random())
  var tmpFile = path.join(tmp, 'package.tgz')
  var tmpDir = path.join(tmp, 'package')
  var _url = toGithub(url)
  if(!_url)
    return cb(new Error('cannot request from:'+url))

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
              //use close because it works in 0.8
              //I want to support old versions, if possible  
              //because like apt-get install nodejs gives 0.6...
              //stupid - but it's out of my control.
              //.on('finish', next)
              .on('close', next)
            fs.readFile(path.join(tmp, 'package', 'package.json'), 'utf8',
              function (err, file) {
                try { pkg = JSON.parse(file) }
                catch (err) { return cb(err) }
                next()
              })

            function next () {
              if(--n) return
              var cache = path.join(process.env.HOME, '.npm', pkg.name, h)
              mkdirp(path.dirname(cache), function() {
                fs.rename(tmp, cache, function (err) {
                  if(err && err.code !== 'ENOTEMPTY')
                    return cb(err)
                  pkg.shasum = h
                  pkg.from = url
                  cb(null, pkg)
                })
              })
            }
          })
        })
      }
  })
}

module.exports.toGithub = toGithub

if(!module.parent) {
  var url = "https://codeload.github.com/substack/node-browser-resolve/tar.gz/dir-replace"
  url = 'https://github.com/isaacs/readable-stream/archive/master.tar.gz'
//  url = 'git://github.com/substack/sockjs-client.git#browserify-npm'
  resolve(url, console.error)
}


