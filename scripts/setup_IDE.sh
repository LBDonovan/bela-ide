#!/bin/bash
#
# This script copies the core BeagleRT files to the BeagleBone Black
# in preparation for building projects. It will remove any existing
# BeagleRT directory before copying the files over

BBB_ADDRESS="root@192.168.7.2"
BBB_PATH="~/Bela"
ALWAYS_YES=0
function usage
{
    THIS_SCRIPT=`basename "$0"`
    echo "Usage: $THIS_SCRIPT [-y] [-b path-on-beaglebone]"

    echo "
    This script copies the Bela IDE files to the BeagleBone, REMOVING
    any previous files found at that location. This should be done after
    running setup_board.sh. The -b option
    changes the default path, which is otherwise $BBB_PATH.
    The -y option prevents the script from prompting for confirmation."
}

OPTIND=1

while getopts "b:hy" opt; do
    case $opt in
        y)            ALWAYS_YES=1
                      ;;
        b)            BBB_PATH=$OPTARG
                      ;;
        h|\?)         usage
                      exit 1
    esac
done

shift $((OPTIND-1))

# Find location of this script so we can locate the rest of the files
SCRIPTPATH=$(readlink "$0")
SCRIPTDIR=$(dirname "$SCRIPTPATH")

if [ $ALWAYS_YES -eq 0 ];
then
  read -p "Warning: this script will DELETE any existing IDE files from your BeagleBone and install the IDE. Continue? (y/N) " -r
else
  REPLY=y
fi

if [[ $REPLY = y ]]
then
# Remove IDE files
  printf "Removing old IDE files..." 
  ssh $BBB_ADDRESS "rm -rf $BBB_PATH/IDE ; mkdir $BBB_PATH/IDE" &&\
  printf "done\n" || { printf "\nError while removing the old files, is the board connected?\n"; exit 1; }
# Copy relevant files to BeagleBone Black
  printf "Copying new IDE files to BeagleBone..."
  scp -rq $SCRIPTDIR/../IDE $BBB_ADDRESS:$BBB_PATH &&\
  printf "done\n" || { printf "\nError while copying files: error $?\n"; exit 1; }

# Make sure the projects folder exists and there is a project in it
  ssh $BBB_ADDRESS "cd $BBB_PATH/; mkdir -p projects/; [ -d projects/basic ] || cp -r examples/basic projects/" &&\
  
# rebuild node dependencies
  printf "Rebuilding node dependencies..."
  ssh $BBB_ADDRESS "cd $BBB_PATH/IDE/; npm rebuild &>/dev/null" &&\
  printf "done\n" || { printf "\nError while rebuilding dependencies.\n"; exit 1; }
else
  echo "Aborting..."
fi

