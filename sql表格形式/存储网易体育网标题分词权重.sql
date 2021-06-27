CREATE TABLE IF NOT EXISTS `sports_title_word_weight` (
  `news_id` varchar(200) ,
  `word` varchar(200) ,
  `weight` DOUBLE,
  PRIMARY KEY (`news_id`,`word`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;