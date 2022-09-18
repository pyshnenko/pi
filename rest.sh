#!/bin/bash
i=0
cat /home/pi/nodeWeb/telegram/rebFile.data | while read y
do
  fullDate=$(date)
  if [[ "$i" == "1" ]]; then
    y=$((y+300))
    ndate=$(date +%s)
    if (( $ndate > $y )); 
      then echo "date > 5"
      echo "false" > /home/pi/nodeWeb/telegram/rebFile.data
      fidate=$(date +%s)
      fidate=$((fidate+90000))
      echo "$fidate" >> /home/pi/nodeWeb/telegram/rebFile.data
      echo "autoreboot at $fullDate" >> /home/pi/timeReboot.txt
      /sbin/reboot
    else
      echo "date < 5"
    fi
  fi
  if [[ "$y" == "true" ]]; then
    fidate=$(date +%s)
    fidate=$((fidate + 90000))
    echo "false" > /home/pi/nodeWeb/telegram/rebFile.data
    echo "$fidate" >> /home/pi/nodeWeb/telegram/rebFile.data
    echo "reboot at $fullDate" >> /home/pi/timeReboot.txt
    /sbin/reboot
  fi
  if [[ "$y" == "gitPush=true" ]]; then
    fidate=$(date +%s)
	echo  "false" > /home/pi/nodeWeb/telegram/rebFile.data
	echo "$fidate" >> /home/pi/nodeWeb/telegram/rebFile.data
	cd /home/pi/nodeWeb/telegram
	git add .
	git commit -m "autoUpdate $fullDate"
	git push > /home/pi/nodeWeb/telegram/gitPull.txt
	echo "git push at $fullDate"
  fi
  if [[ "$y" == "gitPull=true" ]]; then
    fidate=$(date +%s)
    echo  "false" > /home/pi/nodeWeb/telegram/rebFile.data
    echo "$fidate" >> /home/pi/nodeWeb/telegram/rebFile.data
    cd /home/pi/nodeWeb/telegram
	git fetch --all
	git reset --hard origin/main
    git pull > /home/pi/nodeWeb/telegram/gitPull.txt
    echo "git pull at $fullDate" >> /home/pi/timeReboot.txt
  fi
  if [[ "$y" == "restart"  ]]; then
    fidate=$(date +%s)
    echo "false" > /home/pi/nodeWeb/telegram/rebFile.data
    echo "$fidate" >> /home/pi/nodeWeb/telegram/rebFile.data
    echo "restart at $fullDate" >> /home/pi/timeReboot.txt
    systemctl restart serv2
  fi
  i=$((i+1))
done
