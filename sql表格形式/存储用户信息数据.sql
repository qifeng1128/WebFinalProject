CREATE TABLE IF NOT EXISTS `user_info` (
  `username` varchar(200) ,
  `password` varchar(200) DEFAULT NULL,
  `ban` int(11) DEFAULT 0,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;