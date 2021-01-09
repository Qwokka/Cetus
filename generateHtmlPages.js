const ejs = require('ejs')
const fse = require('fs-extra')

const pages = ['background', 'devtools', 'devpanel', 'popup']

const generate = function () {
  pages.map(async page => {
    let html
    if (page === 'popup' || page === 'devpanel') {
      html = await ejs.renderFile(`./src/templates/index.ejs`, { page, env: process.env.NODE_ENV  })
    } else {
      html = await ejs.renderFile(`./src/templates/background.ejs`, { page, env: process.env.NODE_ENV })
    }
    
    fse.outputFile(`./dist/extension/${page}.html`, html, (err) => err ? console.log(err) : console.log(`${page} generated`))
  })
}

generate()