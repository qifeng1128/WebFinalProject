CREATE TABLE IF NOT EXISTS `finance_title_split_word` (
  `id` int(11)  NOT NULL AUTO_INCREMENT,
  `news_id` varchar(200) ,
  `word` varchar(200) ,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;