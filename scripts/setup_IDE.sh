#!/bin/bash
#
# This script copies the core BeagleRT files to the BeagleBone Black
# in preparation for building projects. It will remove any existing
# BeagleRT directory before copying the files over

BBB_ADDRESS="root@192.168.7.2"
BBB_PATH="~/Bela"

function usage
{
    THIS_SCRIPT=`basename "$0"`
    echo "Usage: $THIS_SCRIPT [-b path-on-beaglebone]"

    echo "
    This script copies the Bela IDE files to the BeagleBone, REMOVING
    any previous files found at that location. This should be done after
    running setup_board.sh. The -b option
    changes the default path, which is otherwise $BBB_PATH."
}

OPTIND=1

while getopts "b:h" opt; do
    case $opt in
        b)            BBB_PATH=$OPTARG
                      ;;
        h|\?)         usage
                      exit 1
    esac
done

shift $((OPTIND-1))

# Find location of this script so we can locate the rest of the files
SCRIPTPATH=$(readlink -f "$0")
SCRIPTDIR=$(dirname "$SCRIPTPATH")

read -p "Warning: this script will DELETE any existing IDE files from your BeagleBone! Continue? " -n 1 -r
echo
if [[ $REPLY = y ]]
then
# Remove IDE files
  echo "Removing old IDE files." 
  ssh $BBB_ADDRESS "rm -rf $BBB_PATH/IDE ; mkdir $BBB_PATH/IDE"

# Copy relevant files to BeagleBone Black
  echo "Copying new IDE files to BeagleBone..."
  scp -r $SCRIPTDIR/../IDE $BBB_ADDRESS:$BBB_PATH
echo $?
  if [ $? -ne 0 ]
  then 
	  echo "Error while copying files $?" 
	  exit
  fi
# Make remaining directories needed for building
  echo "Rebuilding node dependencies (might take a minute - please wait)"
  ssh $BBB_ADDRESS "cd $BBB_PATH/IDE/; npm rebuild" &&\
  echo "Done."
else
  echo "Aborting..."
fi

