// 若网页来源不存在，将其设置为中国广播网
var source_name = "中国广播网"
// 设置爬取新闻网站的种子页面
var seedURL = 'http://www.cnr.cn/'
// 设置转码格式
var Encode = 'gbk'
// 获取种子页面中的所有新闻网页的链接，格式为<a href="">
var URL_format = "$('a')"
// 标题
var title_format = "$('.article-header > h1').text()"
// 作者
var author_format = "$('.editor').text()"
// 时间
var date_format = "$('.source > span').text()"
// 内容
var content_format = "$('.article-body > div').text()"
// 来源
var source_format = "$('.source > span').text()"
// 根据正确的网页格式，正则化筛选网址
var url_reg = /\/(\d{8})\/t(\d{8})_(\d{9}).shtml/
// 解析时间日期
var regExp = /((\d{4}|\d{2})(\-|\/|\.)\d{1,2}\3\d{1,2})|(\d{4}年\d{1,2}月\d{1,2}日)/


// 使用request库，向网页发起访问，接收返回内容
var request = require('request')
// 使用iconv-lite库，对网页内容进行转码
var iconv = require('iconv-lite')
// 可以从html的片断中构建DOM结构，然后提供像jquery一样的css选择器查询
var cheerio = require('cheerio')
// 处理时间和日期的库
require('date-utils')
// 调用mysql文件中的对数据库进行查询的模块
var mysql = require('./mysql.js')
// 调用设置定时任务的模块
var schedule = require('node-schedule')

var fs = require('fs')      // 文件读取相关库


// 设置headers，防止网站屏蔽我们的爬虫
var headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
}

// 定义request模块，进行异步fetch url
function MyRequest(url, callback) {
    // 设置GET方法中的参数，其中包括headers
    var options = {
        url: url,
        encoding: null,
        headers: headers,
        timeout: 10000
    }
    request(options, callback)
}

// 定义规则
var rule = new schedule.RecurrenceRule()
// 设置参数
rule.hour = [0,2,4,6,8,10,12,14,16,18,20,22]   // 每隔两小时进行自动爬取数据
rule.minute = 0
rule.second = 0

//定时执行 get_info() 函数
schedule.scheduleJob(rule, function() {
    get_info()
})


function get_info(){
    // 调用request模块，传入种子页面的URL，爬取网站信息
    MyRequest(seedURL, function (err, res, body) {
        // 页面请求成功
        if (!err && res.statusCode == 200) {

            // 对爬取内容进行转码
            seed_html = iconv.decode(body, Encode)
            //console.log(seed_html)

            // 创建一个选择器 $，decodeEntities:false设置了不会出现中文乱码
            var $ = cheerio.load(seed_html, { decodeEntities: true })

            var html_URL
            try {
                html_URL = eval(URL_format)
            } catch (error) {
                console.log("获取种子页面中的链接出现错误：" + error)
            }
            //console.log(html_URL)

            // 遍历伪数组实例对象，获取每个对象的序号index、信息内容body
            html_URL.each(function (index, body) {
                try {
                    var whole_URL = ""   // 存放处理后的网址

                    // 获取href后的页面网址
                    var href = ""
                    href = $(body).attr("href")
                    //console.log(href)

                    // 处理网址信息
                    if (typeof (href) == "undefined") {  // 为获取到href属性，返回undefined，不进行网址保存即可
                        return true
                    }
                    // http://开头的或者https://开头，完整的网址，无需改动
                    if (href.toLowerCase().indexOf('http://') >= 0 || href.toLowerCase().indexOf('https://') >= 0) whole_URL = href;
                    // //开头的，缺少了http:开头，在最前方加上即可
                    else if (href.startsWith('//')) whole_URL = 'http:' + href
                    // 其他，在其前面加上种子页面的网址
                    else whole_URL = seedURL + href

                    // 检验是否符合新闻url的正则表达式
                    if (!url_reg.test(whole_URL)) return
                    else{// 否则根据网址解析网页，获得所需内容
                        // 从数据库中查询URL，判断之前是否进行该网址的爬取
                        var fetch_url_Sql = 'select * from news_info where url=?'    // 从表web_info中提取相应URL的数据
                        var fetch_url_Sql_Params = [whole_URL]     // 查询的参数
                        // 调用mysql文件中的query模块（具有参数的数据库语句查询）
                        mysql.query(fetch_url_Sql, fetch_url_Sql_Params, function(err, result) {
                            if (err) console.log(err)
                            // 查询返回内容表述数据库中存在该URL的数据，即重复爬取
                            if (result.length > 0) {
                                console.log('URL:' + whole_URL + ' duplicate!')
                            } else {
                                //console.log(result)
                                news_get_info(whole_URL)    // 未爬取过这个网页，进行新闻页面的读取
                            }
                        })
                    }

                } catch (error) {
                    console.log("获取页面网址出现错误：" + error)
                }
            })
        }
    })
}


function news_get_info(whole_URL) {
    // 调用request模块，传入种子页面的URL，爬取网站信息
    MyRequest(whole_URL, function (err, res, body) {
        // 页面请求成功
        if (!err && res.statusCode == 200) {

            //console.log(whole_URL)

            // 对爬取内容进行转码
            html_content = iconv.decode(body, Encode)
            //console.log(html_content)

            // 创建一个选择器 $，decodeEntities:false设置了不会出现中文乱码
            var $ = cheerio.load(html_content, { decodeEntities: false })

            //动态执行format字符串，构建json对象准备写入文件或数据库
            var fetch = {}
            fetch.title = ""
            fetch.content = ""
            fetch.publish_date = (new Date()).toFormat("YYYY-MM-DD")
            fetch.url = whole_URL
            fetch.source_name = source_name
            fetch.source_encoding = Encode    //编码
            fetch.crawltime = new Date()

            // 存储标题，若不存在标题则设置为空
            if (title_format == "") fetch.title = ""
            else fetch.title = eval(title_format)

            // 存储刊登日期，由于爬得的日期第一部分则为所需格式的年月日，无需进行时间提取
            if (date_format != "") {
                fetch.publish_date = eval(date_format)
                if (fetch.publish_date != null){
                    fetch.publish_date = fetch.publish_date.replace(/\s/g, "")
                }
            }
            // 根据正则化式，在一个指定字符串中执行一个搜索匹配，返回匹配得到的数组
            fetch.publish_date = regExp.exec(fetch.publish_date)[0];
            // 将年月替代为-，将日删除
            fetch.publish_date = fetch.publish_date.replace('年', '-')
            fetch.publish_date = fetch.publish_date.replace('月', '-')
            fetch.publish_date = fetch.publish_date.replace('日', '')
            console.log('date: ' + fetch.publish_date)
            // 将其转换为Date的格式
            fetch.publish_date = new Date(fetch.publish_date).toFormat("YYYY-MM-DD")

            // 存储作者名称，若不存在，将其设置为网页名，其中删除空格、\t、\n等字符
            if (author_format == "") fetch.author = source_name   
            else {
                fetch.author = eval(author_format)
                if (fetch.author != null){
                    fetch.author = fetch.author.replace(/\s/g, "")
                }
            }

            // 存储内容，若不存在，将其设置为空，其中删除空格、\t、\n等字符
            if (content_format == "") fetch.content = ""
            else {
                fetch.content = eval(content_format)
                if (fetch.content != null){
                    fetch.content = fetch.content.replace(/\s/g, "")
                }
            }

            // 存储来源名，若不存在，将其设置为网页名，其中根据格式获取冒号后内容，再删除"原创版权禁止商业转载"内容
            if (source_format == "") fetch.source = source_name
            else {
                fetch.source = eval(source_format).split(" ")[1].split("：")[1]
                if (fetch.source != null){
                    fetch.source = fetch.source.replace("原创版权禁止商业转载","")
                }
            }

            // var filename = source_name + "_" + (new Date()).toFormat("YYYY-MM-DD") +
            //     "_" + whole_URL.substr(whole_URL.lastIndexOf('/') + 1) + ".json";
            // ////存储json
            // fs.writeFileSync(filename, JSON.stringify(fetch));

            // 编写将爬取的数据写入数据库的mysql语句
            var fetchAddSql = 'INSERT INTO news_info(url,source_name,source_encoding,title,' +
            'source,author,publish_date,crawltime,content) VALUES(?,?,?,?,?,?,?,?,?)'
            // 插入语句中相应的参数
            var fetchAddSql_Params = [fetch.url, fetch.source_name, fetch.source_encoding,
                fetch.title, fetch.source, fetch.author, fetch.publish_date,
                fetch.crawltime.toFormat("YYYY-MM-DD HH24:MI:SS"), fetch.content
            ]

            // 执行sql，数据库中fetch表里的url属性是unique的，不会把重复的url内容写入数据库
            mysql.query(fetchAddSql, fetchAddSql_Params, function(err, result) {
                if (err) {
                    console.log(err)
                }
            })     //mysql写入

        }
    })
}

