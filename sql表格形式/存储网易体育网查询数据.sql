CREATE TABLE IF NOT EXISTS `sportssearch` (
  `id` int(11)  NOT NULL AUTO_INCREMENT,
  `title` varchar(200) DEFAULT NULL,
  `author` varchar(200) DEFAULT NULL,
  `editor` varchar(200) DEFAULT NULL,
  `publish_date` varchar(200) DEFAULT NULL,
  `content` longtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;