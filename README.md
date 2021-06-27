# WebFinalProject

###  基于第一个项目爬虫爬取的数据，完成数据展示网站

### 相关文件内容介绍：

#### spider文件夹：

1、爬取三个新闻网站的 js 代码（东方财富数据的爬取.js、中国广播网数据的爬取.js、网易体育数据的爬取.js）

2、连接数据库的 js 代码（mysql.js）

#### sql表格形式文件夹：

1、存储爬取网站信息的三张表格格式（存储东方财富网查询数据.sql、存储中国广播网查询数据.sql、存储网易体育网查询数据.sql）

2、存储用户查询字段信息的三张表格格式（爬取东方财富网.sql、爬取中国广播网.sql、爬取网易体育.sql）

3、存储标题分词的三张表格格式

4、存储标题分词权重的三张表格格式

5、存储用户操作和信息数据的表格格式

#### public文件夹：

1、主页面（home.html）

2、三个网站信息查询页面（news_info.html、sports_info.html、finance_info.html）

3、三个网站的查询词热度分析的页面（news_search.html、sports_search.html、finance_search.html）

4、管理员页面（administrator.html）

5、三个网址的分词查询页面（news_split_info.html、sports_split_info.html、finance_split_info.html）

6、注册页面（login.html）

7、登录页面（register.html）

#### routes文件夹：

1、后端代码（index.js）

2、对标题进行分词并计算权重代码（split_word.js）

#### 实验报告文件夹：

实验报告的md版本和pdf版本