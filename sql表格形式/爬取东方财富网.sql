CREATE TABLE IF NOT EXISTS `finance_info` (
  `id` int(11)  NOT NULL AUTO_INCREMENT,
  `url` varchar(200) DEFAULT NULL,
  `source_name` varchar(200) DEFAULT NULL,
  `source_encoding` varchar(45) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `editor` varchar(200) DEFAULT NULL,
  `publish_date` date DEFAULT NULL,
  `source` varchar(200) DEFAULT NULL,
  `crawltime` datetime DEFAULT NULL,
  `content` longtext,
  `description` varchar(200) DEFAULT NULL,
  `participate_number` varchar(45) DEFAULT NULL,
  `comment_number` varchar(45) DEFAULT NULL,
  `createtime` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  UNIQUE KEY `url_UNIQUE` (`url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;