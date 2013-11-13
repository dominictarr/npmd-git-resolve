
var test = require('tape')

var resolve = require('../')

function t (name, url) {
  test(name + ' <- ' + url, function (t) {
    resolve(url, function (err, pkg) {
      console.error(err, pkg)
      t.equal(pkg.name, name)
      t.end()
    })
  })
}


t('readable-stream', 'git://github.com/isaacs/readable-stream.git')
t('sockjs-client', 'git://github.com/substack/sockjs-client.git#browserify-npm')
t('readable-stream', 'https://github.com/isaacs/readable-stream/archive/master.tar.gz')
t('sockjs-client', 'substack/sockjs-client.git#browserify-npm')