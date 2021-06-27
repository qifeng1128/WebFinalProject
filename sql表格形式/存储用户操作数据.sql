CREATE TABLE IF NOT EXISTS `user_log` (
  `username` varchar(200) ,
  `operation` varchar(200) ,
  `time` varchar(200) ,
  PRIMARY KEY (`username`,`operation`,`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;