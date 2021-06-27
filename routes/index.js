var express = require('express');
var router = express.Router();
var mysql = require('../mysql.js');
var async = require('async')

// POST方法模块
var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({ extended: false })

// 分词模块
var Segment = require('segment')
var segment = new Segment()    // 创建实例
segment.useDefault()
// 加载停用词
segment.loadStopwordDict('stopword.txt')

// 对查询内容进行分词，并去除停用词
function get_split_word(query){

    var result = segment.doSegment(query, {
        stripStopword: true,
        simple: true
    })
    console.log(result)
    return result
}

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

/* 中国广播网查询 */
// 用户查询返回新闻
router.get('/get_news_info', function(request, response) {

    // 插入用户查询中国广播网数据的操作
    var username = request.cookies.username
    var operation = "查询中国广播网的数据"
    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
    var insertSql_Params = [username,operation] 
    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })

    //sql字符串和参数
    console.log(request);

    var searchSql = 'INSERT INTO newssearch(title,publish_date,author,content)' + ' VALUES (?,?,?,?)'
    var searchSql_Params = [request.query.title,request.query.publish_time,request.query.author,request.query.content] 
    mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })

    var fetchSql = "select url,source,title,author,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date from news_info where title like '%" +
    request.query.title + "%' and author like '%" + 
    request.query.author + "%' and content like '%" +
    request.query.content + "%' and publish_date like '%" + 
    request.query.publish_time + "%'";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        response.status = true;
        response.write(JSON.stringify(result));
        response.end()
    })
})

// 用户查询返回新闻（分词）
router.get('/get_news_split_info', function(request, response) {

    // 插入用户查询中国广播网数据的操作
    var username = request.cookies.username
    var operation = "查询中国广播网的数据"
    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
    var insertSql_Params = [username,operation] 
    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })


    // 获得分词后的结果
    var split_title = get_split_word(request.query.title)
    var split_content = get_split_word(request.query.content)

    // 将用户查询词插入数据库
    var search_title = ""   // 构建查询语句
    for (const v_title of split_title){
        var searchSql = 'INSERT INTO newssearch(title)' + ' VALUES (?)'
        var searchSql_Params = [v_title] 
        mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
            if (err) console.log(err)
        })
        search_title += v_title + "|"
    }
    search_title = search_title.substring(0, search_title.length - 1)
    if (split_title.length == 0) search_title = "|"

    // 将用户查询词插入数据库
    var search_content = ""   // 构建查询语句
    for (const v_content of split_content){
        var searchSql = 'INSERT INTO newssearch(content)' + ' VALUES (?)'
        var searchSql_Params = [v_content] 
        mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
            if (err) console.log(err)
        })
        search_content += v_content + "|"
    }
    search_content = search_content.substring(0, search_content.length - 1)
    if (split_content.length == 0) search_content = "|"

    // 如果用户未输入标题，即不对结果进行排序
    if (search_title == "|"){
        //console.log(search)
        var fetchSql = "select url,source,title,author,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date from news_info where title RLIKE '" + search_title + "' and content RLIKE '" + search_content + "'";
        //console.log(fetchSql)
        mysql.query(fetchSql, function(err, result, fields) {
            console.log(result)
            response.writeHead(200, {
                "Content-Type": "application/json"
            })
            response.status = true;
            response.write(JSON.stringify(result));
            response.end()
        })
    }else{
        // 将分词权重表和新闻信息表根据id连接，选取包含查询关键词的文档id，再计算每个id的得分，最后根据得分排序，返回至前端
        var scoreSql = "select id,url,source,title,author,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,sum(weight) from news_info,news_title_word_weight where news_info.id = news_title_word_weight.news_id and word RLIKE '" + search_title + "' group by news_info.id order by sum(weight) desc"
        mysql.query(scoreSql, function(err, result, fields) {
            response.writeHead(200, {
                "Content-Type": "application/json"
            })
            response.status = true;
            response.write(JSON.stringify(result));
            response.end()
        })
    }
    
})

// 用户不查询，返回推荐的最新新闻
router.get('/get_recommand_news_info', function(request, response) {

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select url,source,title,author,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date from news_info order by publish_date DESC limit 5";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        response.status = true;
        response.write(JSON.stringify(result));
        response.end()
    })
})

// 返回标题查询词的热度分析
router.get('/news_title_info', function(request, response) {

    // 插入用户查询中国广播网的词热度的操作
    var username = request.cookies.username
    var operation = "查看中国广播网的词热度"
    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
    var insertSql_Params = [username,operation] 
    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select title,count(*) from newssearch where title != '' group by title order by count(*) desc";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['title']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

// 返回内容查询词的热度分析
router.get('/news_content_info', function(request, response) {

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select content,count(*) from newssearch where content != '' group by content order by count(*) desc";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['content']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

// 返回查询词的时间热度分析
router.get('/news_time_info', function(request, response) {

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,count(*) from news_info where title like '%" + 
    request.query.title  + "%' group by publish_date order by publish_date";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        console.log(result)
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['new_publish_date']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

/* 网易体育查询 */
// 用户查询返回新闻
router.get('/get_sports_info', function(request, response) {

    // 插入用户查询网易体育数据的操作
    var username = request.cookies.username
    var operation = "查询网易体育的数据"
    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
    var insertSql_Params = [username,operation] 
    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })

    //sql字符串和参数
    console.log(request);

    var searchSql = 'INSERT INTO sportssearch(title,publish_date,author,editor,content)' + ' VALUES (?,?,?,?,?)'
    var searchSql_Params = [request.query.title,request.query.publish_time,request.query.author,request.query.editor,request.query.content] 
    mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })

    var fetchSql = "select url,source,title,author,editor,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date from sports_info where title like '%" +
    request.query.title + "%' and author like '%" + 
    request.query.author + "%' and content like '%" +
    request.query.content + "%' and publish_date like '%" + 
    request.query.publish_time + "%'";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        response.status = true;
        response.write(JSON.stringify(result));
        response.end()
    })
})

// 用户查询返回新闻（分词）
router.get('/get_sports_split_info', function(request, response) {

    // 插入用户查询网易体育数据的操作
    var username = request.cookies.username
    var operation = "查询网易体育的数"
    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
    var insertSql_Params = [username,operation] 
    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })


    // 获得分词后的结果
    var split_title = get_split_word(request.query.title)
    var split_content = get_split_word(request.query.content)

    // 将用户查询词插入数据库
    var search_title = ""   // 构建查询语句
    for (const v_title of split_title){
        var searchSql = 'INSERT INTO sportssearch(title)' + ' VALUES (?)'
        var searchSql_Params = [v_title] 
        mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
            if (err) console.log(err)
        })
        search_title += v_title + "|"
    }
    search_title = search_title.substring(0, search_title.length - 1)
    if (split_title.length == 0) search_title = "|"

    // 将用户查询词插入数据库
    var search_content = ""   // 构建查询语句
    for (const v_content of split_content){
        var searchSql = 'INSERT INTO sportssearch(content)' + ' VALUES (?)'
        var searchSql_Params = [v_content] 
        mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
            if (err) console.log(err)
        })
        search_content += v_content + "|"
    }
    search_content = search_content.substring(0, search_content.length - 1)
    if (split_content.length == 0) search_content = "|"

    // 如果用户未输入标题，即不对结果进行排序
    if (search_title == "|"){
        var fetchSql = "select url,source,title,author,editor,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date from sports_info where title RLIKE '" + search_title + "' and content RLIKE '" + search_content + "'";
        //console.log(fetchSql)
        mysql.query(fetchSql, function(err, result, fields) {
            response.writeHead(200, {
                "Content-Type": "application/json"
            })
            response.status = true;
            response.write(JSON.stringify(result));
            response.end()
        })
    }else{
        // 将分词权重表和新闻信息表根据id连接，选取包含查询关键词的文档id，再计算每个id的得分，最后根据得分排序，返回至前端
        var scoreSql = "select id,url,source,title,author,editor,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,sum(weight) from sports_info,sports_title_word_weight where sports_info.id = sports_title_word_weight.news_id and word RLIKE '" + search_title + "' group by sports_info.id order by sum(weight) desc"
        mysql.query(scoreSql, function(err, result, fields) {
            response.writeHead(200, {
                "Content-Type": "application/json"
            })
            response.status = true;
            response.write(JSON.stringify(result));
            response.end()
        })
    }
})

// 用户不查询，返回推荐的最新新闻
router.get('/get_recommand_sports_info', function(request, response) {

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select url,source,title,author,editor,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date from sports_info order by publish_date DESC limit 5";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        response.status = true;
        response.write(JSON.stringify(result));
        response.end()
    })
})

// 返回标题查询词的热度分析
router.get('/sports_title_info', function(request, response) {

    // 插入用户查询网易体育的词热度的操作
    var username = request.cookies.username
    var operation = "查看网易体育的词热度"
    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
    var insertSql_Params = [username,operation] 
    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select title,count(*) from sportssearch where title != '' group by title order by count(*) desc";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['title']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

// 返回内容查询词的热度分析
router.get('/sports_content_info', function(request, response) {

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select content,count(*) from sportssearch where content != '' group by content order by count(*) desc";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['content']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

// 返回查询词的时间热度分析
router.get('/sports_time_info', function(request, response) {

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,count(*) from sports_info where title like '%" + 
    request.query.title  + "%' group by publish_date order by publish_date";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        console.log(result)
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['new_publish_date']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

/* 东方财富网查询 */
// 用户查询返回新闻
router.get('/get_finance_info', function(request, response) {

    // 插入用户查询东方财富网数据的操作
    var username = request.cookies.username
    var operation = "查询东方财富网的数据"
    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
    var insertSql_Params = [username,operation] 
    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })

    //sql字符串和参数
    console.log(request);

    var searchSql = 'INSERT INTO financesearch(title,publish_date,editor,description,content)' + ' VALUES (?,?,?,?,?)'
    var searchSql_Params = [request.query.title,request.query.publish_time,request.query.editor,request.query.description,request.query.content] 
    mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })

    var fetchSql = "select url,source,title,editor,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,participate_number from finance_info where title like '%" +
    request.query.title + "%' and editor like '%" + 
    request.query.editor + "%' and content like '%" +
    request.query.content + "%' and publish_date like '%" + 
    request.query.publish_time + "%' and description like '%" + 
    request.query.description + "%'";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        response.status = true;
        response.write(JSON.stringify(result));
        response.end()
    })
})

// 用户查询返回新闻（分词）
router.get('/get_finance_split_info', function(request, response) {

    // 插入用户查询东方财富网数据的操作
    var username = request.cookies.username
    var operation = "查询东方财富网的数据"
    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
    var insertSql_Params = [username,operation] 
    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })


    // 获得分词后的结果
    var split_title = get_split_word(request.query.title)
    var split_content = get_split_word(request.query.content)

    // 将用户查询词插入数据库
    var search_title = ""   // 构建查询语句
    for (const v_title of split_title){
        var searchSql = 'INSERT INTO financesearch(title)' + ' VALUES (?)'
        var searchSql_Params = [v_title] 
        mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
            if (err) console.log(err)
        })
        search_title += v_title + "|"
    }
    search_title = search_title.substring(0, search_title.length - 1)
    if (split_title.length == 0) search_title = "|"

    // 将用户查询词插入数据库
    var search_content = ""   // 构建查询语句
    for (const v_content of split_content){
        var searchSql = 'INSERT INTO financesearch(content)' + ' VALUES (?)'
        var searchSql_Params = [v_content] 
        mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
            if (err) console.log(err)
        })
        search_content += v_content + "|"
    }
    search_content = search_content.substring(0, search_content.length - 1)
    if (split_content.length == 0) search_content = "|"

    // 如果用户未输入标题，即不对结果进行排序
    if (search_title == "|"){
        var fetchSql = "select url,source,title,editor,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,participate_number from finance_info where title RLIKE '" + search_title + "' and content RLIKE '" + search_content + "'";
        //console.log(fetchSql)
        mysql.query(fetchSql, function(err, result, fields) {
            response.writeHead(200, {
                "Content-Type": "application/json"
            })
            response.status = true;
            response.write(JSON.stringify(result));
            response.end()
        })
    }else{
        // 将分词权重表和新闻信息表根据id连接，选取包含查询关键词的文档id，再计算每个id的得分，最后根据得分排序，返回至前端
        var scoreSql = "select id,url,source,title,editor,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,participate_number,sum(weight) from finance_info,finance_title_word_weight where finance_info.id = finance_title_word_weight.news_id and word RLIKE '" + search_title + "' group by finance_info.id order by sum(weight) desc"
        mysql.query(scoreSql, function(err, result, fields) {
            response.writeHead(200, {
                "Content-Type": "application/json"
            })
            response.status = true;
            response.write(JSON.stringify(result));
            response.end()
        })
    }
})

// 用户不查询，返回推荐的最新新闻
router.get('/get_recommand_finance_info', function(request, response) {

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select url,source,title,editor,cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,participate_number from finance_info order by publish_date DESC limit 5";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        response.status = true;
        response.write(JSON.stringify(result));
        response.end()
    })
})

// 返回标题查询词的热度分析
router.get('/finance_title_info', function(request, response) {

    // 插入用户查询东方财富网的词热度的操作
    var username = request.cookies.username
    var operation = "查看东方财富网的词热度"
    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
    var insertSql_Params = [username,operation] 
    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
        if (err) console.log(err)
    })

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select title,count(*) from financesearch where title != '' group by title order by count(*) desc";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['title']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

// 返回内容查询词的热度分析
router.get('/finance_content_info', function(request, response) {

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select content,count(*) from financesearch where content != '' group by content order by count(*) desc";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['content']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

// 返回查询词的时间热度分析
router.get('/finance_time_info', function(request, response) {

    //sql字符串和参数
    console.log(request);
    var fetchSql = "select cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,count(*) from finance_info where title like '%" + 
    request.query.title  + "%' group by publish_date order by publish_date";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        console.log(result)
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['new_publish_date']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

// 判断用户是否可以登录
router.post('/user_login', urlencodedParser, function(request, response) {

    // 获得用户输入的用户名和密码
    var username = request.body.name
    var password = request.body.pwd
    var tempt = {}
    // 从数据库中查询username是否存在
    var fetch_username_Sql = 'select username,password,ban from user_info where username=?'  
    var fetch_username_Sql_Params = [username]  

    // 调用mysql文件中的query模块（具有参数的数据库语句查询）
    mysql.query(fetch_username_Sql, fetch_username_Sql_Params, function(err, result) {
        console.log(result)
        if (err) console.log(err)
        // user表中保证用户名不重复，只可能不返回数据或返回一条数据
        if (result.length > 0) {
            // 判断用户的账号是否被管理员禁掉
            var flag = result[0]['ban']
            console.log(flag)

            if (flag == 1){
                // 被管理员禁止
                tempt.status = 'you have been banned by the administrator'
                response.end(JSON.stringify(tempt))
                return
            }else{
                // 用户未被管理员禁止，查询用户输入的密码是否相同
                var correct_pwd = result[0]['password']
                if (correct_pwd == password){
                    // 添加用户登录日志
                    var operation = "用户登录"
                    var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
                    var insertSql_Params = [username,operation] 
                    mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
                        if (err) console.log(err)
                    })
                    // 用户可以登录查看数据
                    tempt.status = 'login success'
                    // 将用户存入cookie中，便于防止非注册用户查看数据
                    response.cookie("username", username)
                    response.end(JSON.stringify(tempt))
                    return
                }else{
                    // 输入密码不正确
                    tempt.status = 'password is not correct'
                    response.end(JSON.stringify(tempt))
                    return
                }
            }
        } else {
            // 用户未注册过
            tempt.status = 'please register first'
            response.write(JSON.stringify(tempt))
            response.end()
            return
        }
    })
})


// 判断用户是否注册过
router.post('/user_register', urlencodedParser, function(request, response) {

    // 获得用户输入的用户名和密码
    var username = request.body.name
    var password = request.body.pwd

    var tempt = {}

    //console.log(typeof(username))
    //console.log(password)
    // 判断用户注册的昵称和密码是否为空
    if (username.length == 0 || password.length == 0){
        tempt.status = 'please input your username or password'
        response.end(JSON.stringify(tempt))
        return
    }
    
    // 从数据库中查询username是否存在
    var fetch_username_Sql = 'select username,password from user_info where username=?'  
    var fetch_username_Sql_Params = [username]  

    // 调用mysql文件中的query模块（具有参数的数据库语句查询）
    mysql.query(fetch_username_Sql, fetch_username_Sql_Params, function(err, result) {
        //console.log(result)
        if (err) console.log(err)
        // user表中保证用户名不重复，只可能不返回数据或返回一条数据
        if (result.length > 0) {
            // 用户已经注册过或者用户名重复
            tempt.status = 'the username is duplicated'
            response.end(JSON.stringify(tempt))
            return
        }else{
            // 添加用户注册日志
            var operation = "用户注册"
            var insertSql = 'INSERT INTO user_log(username,operation,time)' + ' VALUES (?,?,now())'
            var insertSql_Params = [username,operation] 
            mysql.query(insertSql, insertSql_Params, function(err, result, fields) {
                if (err) console.log(err)
            })
            // 用户注册成功
            tempt.status = 'register success'
            // 在user_info表中插入信息
            var fetchAddSql = 'INSERT INTO user_info(username,password) VALUES(?,?)'
            // 插入语句中相应的参数
            var fetchAddSql_Params = [username,password]
            // 执行sql
            mysql.query(fetchAddSql, fetchAddSql_Params, function(err, result) {
                if (err) {
                    console.log(err)
                }
            })     //mysql写入
            response.end(JSON.stringify(tempt))
            return
        }
    })
})

// 判断用户是否已经登录，从而判断其是否可以查看数据
router.get('/check', function(request, response) {

    // 通过cookies获得用户登录时保存的用户名
    var username = request.cookies.username
    if(typeof(username) == undefined) {   // 此时用户未登录
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        response.write('false')
        response.end()
        return
    } else {    // 判断数据库中是否拥有用户名
        console.log(username)

        var fetch_username_Sql = 'select username,password from user_info where username=?'  
        var fetch_username_Sql_Params = [username]  
    
        // 调用mysql文件中的query模块（具有参数的数据库语句查询）
        mysql.query(fetch_username_Sql, fetch_username_Sql_Params, function(err, result) {
            console.log(result.length)
            if (err) console.log(err)
            // user表中保证用户名不重复，只可能不返回数据或返回一条数据
            if (result.length > 0) {
                // 用户已经登录过了，可以进行数据查看
                response.writeHead(200, {
                    "Content-Type": "application/json"
                })
                response.write('true')
                response.end()
                return
            }
            else{   // 用户未登录
                response.writeHead(200, {
                    "Content-Type": "application/json"
                })
                response.write('false')
                response.end()
                return
            }
        })
    }
})

// 返回注册用户的操作
router.get('/get_user_operation', function(request, response) {

    var fetchSql = "select username,operation,time from user_log";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        response.status = true;
        response.write(JSON.stringify(result));
        response.end()
    })
})

// 返回注册的用户
router.get('/regist_user', function(request, response) {

    var fetchSql = "select distinct username from user_log";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        response.status = true;
        response.write(JSON.stringify(result));
        response.end()
    })
})

// 禁止用户
router.post('/ban_user', urlencodedParser, function(request, response) {

    // 获得用户名
    var username = request.body.name
    var tempt = {}
    // 判断用户是否已经被禁止了
    var fetch_username_Sql = 'select ban from user_info where username=?'  
    var fetch_username_Sql_Params = [username]  

    // 调用mysql文件中的query模块（具有参数的数据库语句查询）
    mysql.query(fetch_username_Sql, fetch_username_Sql_Params, function(err, result) {
        console.log(result)
        if (err) console.log(err)
        var flag = result[0]['ban']
        if (flag == 1){
            // 被管理员禁止
            tempt.status = 'you have banned the user'
            response.end(JSON.stringify(tempt))
            return
        }else{
            // 用户未被禁止，将其禁止
            var update_ban_Sql = 'update user_info set ban=? where username=?'  
            var update_ban_Sql_Params = [1,username]  

            // 调用mysql文件中的query模块（具有参数的数据库语句查询）
            mysql.query(update_ban_Sql, update_ban_Sql_Params, function(err, result) {
                console.log(result)
                if (err) console.log(err)
            })

            // 返回禁止成功语句
            tempt.status = 'ban success'
            response.end(JSON.stringify(tempt))
            return
        }
    })
})

// 启动用户
router.post('/start_user', urlencodedParser, function(request, response) {

    // 获得用户名
    var username = request.body.name
    var tempt = {}
    // 判断用户是否已经被禁止了
    var fetch_username_Sql = 'select ban from user_info where username=?'  
    var fetch_username_Sql_Params = [username]  

    // 调用mysql文件中的query模块（具有参数的数据库语句查询）
    mysql.query(fetch_username_Sql, fetch_username_Sql_Params, function(err, result) {
        console.log(result)
        if (err) console.log(err)
        var flag = result[0]['ban']
        if (flag == 1){
            // 用户被禁止，将其启动
            var update_ban_Sql = 'update user_info set ban=? where username=?'  
            var update_ban_Sql_Params = [0,username]  

            // 调用mysql文件中的query模块（具有参数的数据库语句查询）
            mysql.query(update_ban_Sql, update_ban_Sql_Params, function(err, result) {
                console.log(result)
                if (err) console.log(err)
            })

            // 返回启动成功语句
            tempt.status = 'start success'
            response.end(JSON.stringify(tempt))
            return
        }else{
            // 未被禁止
            tempt.status = 'the user is not banned'
            response.end(JSON.stringify(tempt))
            return
        }
    })
})

// 判断管理员是否可以登录
router.post('/administrator_login', urlencodedParser, function(request, response) {

    // 获得用户输入的用户名和密码
    var username = request.body.name
    var password = request.body.pwd
    var tempt = {}
    // 判断管理员的用户名和密码是否正确
    if (username == "guanliyuan" && password == "123456"){
        // 保存cookie
        response.cookie("username", username)
        // 用户名与密码正确，转跳到管理员界面
        tempt.status = 'login success'
        response.end(JSON.stringify(tempt))
        return
    }else{
        // 用户名或密码不正确，转跳登录界面
        tempt.status = 'username or password not correct'
        response.end(JSON.stringify(tempt))
        return
    }
})

module.exports = router;