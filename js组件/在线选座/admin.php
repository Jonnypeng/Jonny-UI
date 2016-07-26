<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>购票确认</title>
<link rel="stylesheet" href="http://apps.bdimg.com/libs/fontawesome/4.4.0/css/font-awesome.min.css">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div id="seat_con">
	<div id="seat_cho">
		<div id="seat_tit">
			贵州省麻江县多彩贵州舞蹈大赛
		</div>
		<div id="seat_detail">
				<div id="cartBuyInfo">
			<?php 
				echo $_POST["seat"];
			?>
				</div>
		</div>
	</div>
	<div id="seat_result">
		<div id="total">
				您将支付￥<span><?php echo $_POST["total"]?></span>元
		</div>
		<div id="pay">
			<div id="alipay">
			<img src="icons/alipay.gif" alt="">
</div>
		</div>
	</div>
</div>
</body>
</html>
