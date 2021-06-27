var express = require('express');
var router = express.Router();
var mysql = require('../mysql.js');


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

// 对中国广播网的 title 内容进行分词
function news_split_word(){
    var fetchSql = "select id,title from news_info"
    mysql.query_noparam(fetchSql, function(err, result, fields) {
        for (var i = 0; i < result.length; i++) {
            //console.log(result[i]['title'])
            // 对标题进行分词，将分词结果和其对应的id存入表news_title_split_word中
            var the_id = result[i]['id']
            var the_title = result[i]['title']
            // 进行分词
            var the_result = get_split_word(the_title)
            for (const v_title of the_result){
                // 插入分词结果
                var searchSql = 'INSERT INTO news_title_split_word(news_id,word)' + ' VALUES (?,?)'
                var searchSql_Params = [the_id,v_title] 
                mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
                    if (err) console.log(err)
                })
            }
        }
    })
}

// 计算中国广播网 title 分词后的权重 (tf-idf)
function news_word_weight(){

    // 由于总文档数均相等，计算一遍即可
    var total_document    // 总文档数
    var total_document_sql = "select count(*) as num1 from news_info"
    mysql.query_noparam(total_document_sql, function(err, result, fields) {
        //console.log(result)
        total_document = result[0]['num1']

        // 获取 文档id-单词的所有数据，计算某个单词在某个文档中的权重
        var fetchSql = "select news_id,word from news_title_split_word"
        mysql.query_noparam(fetchSql, function(err, result, fields) {
            result.forEach(function(item){
                var the_news_id = item['news_id']
                var the_word = item['word']
                //console.log(the_news_id)
                //console.log(the_word)

                // tf值：单词在文章中出现次数对应文章总单词数的占比
                var total_frequency    // 文章总单词数
                var total_fre_sql = "select count(*) as num2 from news_title_split_word where news_id=" + the_news_id
                mysql.query_noparam(total_fre_sql, function(err, result, fields) {
                    //console.log(result)
                    total_frequency = result[0]['num2']

                    var word_frequency   // 单词在文章中出现次数
                    var word_fre_sql = "select count(*) as num3 from news_title_split_word where news_id=" + the_news_id + " and word='" + the_word + "'"
                    mysql.query_noparam(word_fre_sql, function(err, result, fields) {
                        //console.log(result)
                        word_frequency = result[0]['num3']

                        var tf = word_frequency / total_frequency

                        // idf值：包含word的文档数量在总文档数中占比
                        var word_document    // 包含word的文档数量
                        var word_document_sql = "select count(distinct news_id) as num4 from news_title_split_word where word='" + the_word + "'"
                        mysql.query_noparam(word_document_sql, function(err, result, fields) {
                            //console.log(result)
                            word_document = result[0]['num4']

                            var idf = word_document / total_document

                            // 计算最终权重
                            var final_weight = tf * Math.log(1 / idf)
                            // 插入权重结果
                            var weightSql = 'INSERT INTO news_title_word_weight(news_id,word,weight)' + ' VALUES (?,?,?)'
                            var weightSql_Params = [the_news_id,the_word,final_weight] 
                            mysql.query(weightSql, weightSql_Params, function(err, result, fields) {
                                if (err) console.log(err)
                            })
                        })
                    })
                })
            })
        })
    })    
}

// 对网易体育网的 title 内容进行分词
function sports_split_word(){
    var fetchSql = "select id,title from sports_info"
    mysql.query_noparam(fetchSql, function(err, result, fields) {
        for (var i = 0; i < result.length; i++) {
            //console.log(result[i]['title'])
            // 对标题进行分析，将分词结果和其对应的id存入表sports_title_split_word中
            var the_id = result[i]['id']
            var the_title = result[i]['title']
            var the_result = get_split_word(the_title)
            for (const v_title of the_result){
                // 插入分词结果
                var searchSql = 'INSERT INTO sports_title_split_word(news_id,word)' + ' VALUES (?,?)'
                var searchSql_Params = [the_id,v_title] 
                mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
                    if (err) console.log(err)
                })
            }
        }
    })
}

// 计算网易体育网 title 分词后的权重 (tf-idf)
function sports_word_weight(){

    // 由于总文档数均相等，计算一遍即可
    var total_document    // 总文档数
    var total_document_sql = "select count(*) as num1 from sports_info"
    mysql.query_noparam(total_document_sql, function(err, result, fields) {
        //console.log(result)
        total_document = result[0]['num1']

        // 获取 文档id-单词的所有数据，计算某个单词在某个文档中的权重
        var fetchSql = "select news_id,word from sports_title_split_word"
        mysql.query_noparam(fetchSql, function(err, result, fields) {
            result.forEach(function(item){
                var the_news_id = item['news_id']
                var the_word = item['word']
                //console.log(the_news_id)
                //console.log(the_word)

                // tf值：单词在文章中出现次数对应文章总单词数的占比
                var total_frequency    // 文章总单词数
                var total_fre_sql = "select count(*) as num2 from sports_title_split_word where news_id=" + the_news_id
                mysql.query_noparam(total_fre_sql, function(err, result, fields) {
                    //console.log(result)
                    total_frequency = result[0]['num2']

                    var word_frequency   // 单词在文章中出现次数
                    var word_fre_sql = "select count(*) as num3 from sports_title_split_word where news_id=" + the_news_id + " and word='" + the_word + "'"
                    mysql.query_noparam(word_fre_sql, function(err, result, fields) {
                        //console.log(result)
                        word_frequency = result[0]['num3']

                        var tf = word_frequency / total_frequency

                        // idf值：包含word的文档数量在总文档数中占比
                        var word_document    // 包含word的文档数量
                        var word_document_sql = "select count(distinct news_id) as num4 from sports_title_split_word where word='" + the_word + "'"
                        mysql.query_noparam(word_document_sql, function(err, result, fields) {
                            //console.log(result)
                            word_document = result[0]['num4']

                            var idf = word_document / total_document

                            // 计算最终权重
                            var final_weight = tf * Math.log(1 / idf)
                            // 插入权重结果
                            var weightSql = 'INSERT INTO sports_title_word_weight(news_id,word,weight)' + ' VALUES (?,?,?)'
                            var weightSql_Params = [the_news_id,the_word,final_weight] 
                            mysql.query(weightSql, weightSql_Params, function(err, result, fields) {
                                if (err) console.log(err)
                            })
                        })
                    })
                })
            })
        })
    })    
}

// 对东方财富网的 title 内容进行分词
function finance_split_word(){
    var fetchSql = "select id,title from finance_info"
    mysql.query_noparam(fetchSql, function(err, result, fields) {
        for (var i = 0; i < result.length; i++) {
            //console.log(result[i]['title'])
            // 对标题进行分析，将分词结果和其对应的id存入表finance_title_split_word中
            var the_id = result[i]['id']
            var the_title = result[i]['title']
            var the_result = get_split_word(the_title)
            for (const v_title of the_result){
                // 插入分词结果
                var searchSql = 'INSERT INTO finance_title_split_word(news_id,word)' + ' VALUES (?,?)'
                var searchSql_Params = [the_id,v_title] 
                mysql.query(searchSql, searchSql_Params, function(err, result, fields) {
                    if (err) console.log(err)
                })
            }
        }
    })
}

// 计算东方财富网 title 分词后的权重 (tf-idf)
function finance_word_weight(){

    // 由于总文档数均相等，计算一遍即可
    var total_document    // 总文档数
    var total_document_sql = "select count(*) as num1 from finance_info"
    mysql.query_noparam(total_document_sql, function(err, result, fields) {
        //console.log(result)
        total_document = result[0]['num1']

        // 获取 文档id-单词的所有数据，计算某个单词在某个文档中的权重
        var fetchSql = "select news_id,word from finance_title_split_word"
        mysql.query_noparam(fetchSql, function(err, result, fields) {
            result.forEach(function(item){
                var the_news_id = item['news_id']
                var the_word = item['word']
                //console.log(the_news_id)
                //console.log(the_word)

                // tf值：单词在文章中出现次数对应文章总单词数的占比
                var total_frequency    // 文章总单词数
                var total_fre_sql = "select count(*) as num2 from finance_title_split_word where news_id=" + the_news_id
                mysql.query_noparam(total_fre_sql, function(err, result, fields) {
                    //console.log(result)
                    total_frequency = result[0]['num2']

                    var word_frequency   // 单词在文章中出现次数
                    var word_fre_sql = "select count(*) as num3 from finance_title_split_word where news_id=" + the_news_id + " and word='" + the_word + "'"
                    mysql.query_noparam(word_fre_sql, function(err, result, fields) {
                        //console.log(result)
                        word_frequency = result[0]['num3']

                        var tf = word_frequency / total_frequency

                        // idf值：包含word的文档数量在总文档数中占比
                        var word_document    // 包含word的文档数量
                        var word_document_sql = "select count(distinct news_id) as num4 from finance_title_split_word where word='" + the_word + "'"
                        mysql.query_noparam(word_document_sql, function(err, result, fields) {
                            //console.log(result)
                            word_document = result[0]['num4']

                            var idf = word_document / total_document

                            // 计算最终权重
                            var final_weight = tf * Math.log(1 / idf)
                            // 插入权重结果
                            var weightSql = 'INSERT INTO finance_title_word_weight(news_id,word,weight)' + ' VALUES (?,?,?)'
                            var weightSql_Params = [the_news_id,the_word,final_weight] 
                            mysql.query(weightSql, weightSql_Params, function(err, result, fields) {
                                if (err) console.log(err)
                            })
                        })
                    })
                })
            })
        })
    })    
}

news_split_word()
news_word_weight()
sports_split_word()
sports_word_weight()
finance_split_word()
finance_word_weight()

module.exports = router;