#!/bin/sh

wget 'http://downloads.raspberrypi.org/raspbian_lite/images/raspbian_lite-2018-04-19/2018-04-18-raspbian-stretch-lite.zip' -O raspbian.img.zip
unzip raspbian.img.zip
wget 'https://github.com/dhruvvyas90/qemu-rpi-kernel/raw/master/kernel-qemu-4.9.59-stretch' -O kernel-qemu
