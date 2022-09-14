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
      echo "autoreboot at $fullDate" > /home/pi/timeReboot.txt
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
    echo "reboot at $fullDate" > /home/pi/timeReboot.txt
    /sbin/reboot
  fi
  if [[ "$y" == "gitPull=true" ]]; then
    fidate=$(date+%s)
    echo  "false" > /home/pi/nodeWeb/telegram/rebFile.data
    echo "$fidate" >> /home/pi/nodeWeb/telegram/rebFile.data
    cd /home/pi/nodeWeb/telegram
    git pull > /home/pi/nodeWeb/telegram/gitPull.txt
  fi
  if [[ "$y" == "restart"  ]]; then
    fidate=$(date+%s)
    echo "false" > /home/pi/nodeWeb/telegram/rebFile.data
    echo "$fidate" >> /home/pi/nodeWeb/telegram/rebFile.data
    systemctl restart serv2
  fi
  i=$((i+1))
done
