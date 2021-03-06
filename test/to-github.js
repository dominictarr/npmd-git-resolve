
var test = require('tape')

var toGithub = require('../').toGithub

function t (giturl, url) {
  test(giturl + ' -> ' +url, function (t) {
    var _url = toGithub(giturl)
    console.log(_url)
    t.equal(_url, url)
    t.end()
  })
}


t(
  'git://github.com/isaacs/readable-stream.git',
  'https://codeload.github.com/isaacs/readable-stream/tar.gz/master'
)
t(
  'git://github.com/substack/sockjs-client.git#browserify-npm',
  'https://codeload.github.com/substack/sockjs-client/tar.gz/browserify-npm'
)
t(
  'shtylman/engine.io-client#v0.5.0-dz0',
  'https://codeload.github.com/shtylman/engine.io-client/tar.gz/v0.5.0-dz0'
)

t(
  'substack/sockjs-client.git#browserify-npm',
  'https://codeload.github.com/substack/sockjs-client/tar.gz/browserify-npm'

)

