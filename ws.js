const http = require('http');
const url = require('url');
const puppeteer = require('puppeteer');
const fs = require('fs');
const Handlebars = require("handlebars");
const { parse } = require('querystring');
var moment = require('moment');


const hostname = '';
const port = 3001;

const server = http.createServer((req, res) => {

	if (req.method !== 'POST') {
		// Return error
		res.statusCode = 400;
		res.setHeader('Content-Type', 'text/plain');
		res.end('Bad request');
	}else{

		var date = new Date();

		// date +timezone
		dateFile = moment().format().replace(/T|-|:/g, "").replace(/\..+/,'').split('+')[0];
		dateFolder = moment().format().split('T')[0];

		client = 1;
		path = 'websiteScreenshots/' + client + "/" + dateFolder + "/";

		// OK to proceed
		collectRequestData(req, result => {
      
            fileId = (result.fileId) ? result.fileId : Math.floor(Math.random() * (999 - 10) + 10);
		
			url_short = result.url.replace('http://','');
			url_short = result.url.replace('https://','');
         
		    filename = fileId + "_" + dateFile + "_" + Math.floor(Math.random() * (999 - 10) + 10) + ".png";
            image_path = path + filename;

			// Call the newly created page in chromium and take a screenshot of the image
			page = '';
			createScreenshot(result.url, image_path)
				.then(obj => respondJson(obj,image_path,res))
				.catch((err) => {
					console.log(err)
                 })
	
		});
	}
});

function respondJson(obj,imageName,res){
	page = obj['page'];

	const outfileConsole = obj['console_outfile'];
	const outfileHeader = imageName.replace('.png','-header.txt');
	const outfileHTML = imageName.replace('.png','.html');
	
	res.statusCode = 200;
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify({ status: 200, image: imageName, headerFile: outfileHeader, htmlFile: outfileHTML, consoleFile: outfileConsole}));
}



// Create a screenshot 
function createScreenshot(url, outfile){
    return new Promise(async (resolve, reject) => {
        try{

            const browser = await puppeteer.launch({
                headless: true,
                 args: ['--no-sandbox', '--disable-setuid-sandbox']
			  });
			  
            const page = await browser.newPage();

            console.log("processing web page");

            await page.setViewport({ width: 1920, height: 1080 });

			// retrieve errors from the console
			pageErrors = '';
			page.on("pageerror", function(err) {
				pageErrors += err.toString();
			});
	
            //await page.evaluate(() => document.body.style.background = 'transparent');
            const response = await page.goto(url, { waitUntil: 'networkidle0' });

			const headers = response.headers();
			
			// Save header information to file
			var jsonContent = JSON.stringify(headers);
			const outfileHeader = outfile.replace('.png','-header.txt');
			fs.writeFileSync(outfileHeader, jsonContent);

			// Save console errors if they exist	
			var outfileConsole = '';
			if(pageErrors){
				outfileConsole = outfile.replace('.png','-console.txt');	
				fs.writeFileSync(outfileConsole, pageErrors);
			}
		
			// Create screenshot of the webpage
            await page.screenshot({path: outfile, fullPage: true });
            console.log('2 finished creating screenshot');

			// Save html content to file 
			const html = await page.content();
			const outfileHTML = outfile.replace('.png','.html');
			fs.writeFileSync(outfileHTML, html);

			await browser.close();
			
            console.log('closing browser');
	
			var obj = {
				page: page,
				console_outfile: outfileConsole, 
			};

            return resolve(obj);
        }
        catch(e){
            return reject(e);
        }
    });
}

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});



function collectRequestData(request, callback) {
    const FORM_URLENCODED = 'application/x-www-form-urlencoded';
    if(request.headers['content-type'] === FORM_URLENCODED) {
        let body = '';
        request.on('data', chunk => {
            body += chunk.toString();
        });
        request.on('end', () => {
            callback(parse(body));
        });
    }
    else {
        callback(null);
    }
}

