#!/bin/sh
#
# This script copies the core BeagleRT files to the BeagleBone Black
# in preparation for building projects. It will remove any existing
# BeagleRT directory before copying the files over

[ -z "$BBB_ADDRESS" ] && BBB_ADDRESS="root@192.168.7.2"
[ -z "$BBB_BELA_HOME" ] && BBB_BELA_HOME="~/Bela"

ALWAYS_YES=0
usage()
{
    THIS_SCRIPT=`basename "$0"`
    echo "Usage: $THIS_SCRIPT [-y] [-b path-on-beaglebone]"

    echo "
    This script copies the Bela IDE files to the BeagleBone, REMOVING
    any previous files found at that location. This should be done after
    running setup_board.sh. The -b option
    changes the default path, which is otherwise $BBB_BELA_HOME.
    The -y option prevents the script from prompting for confirmation."
}

OPTIND=1
while getopts "b:hy" opt; do
    case $opt in
        y)            ALWAYS_YES=1
                      ;;
        b)            BBB_BELA_HOME=$OPTARG
                      ;;
        h|\?)         usage
                      exit 1
    esac
done

shift $((OPTIND-1))

# Find location of this script so we can locate the rest of the files
SCRIPTDIR=$(dirname "$0")

printf "Warning: this script will DELETE any existing IDE files from your BeagleBone and install the IDE. Continue? (y/N) "

if [ $ALWAYS_YES -eq 1 ];
then
  printf "y\n"
else 
  read REPLY;
  [ -z "$REPLY" ] || { [ "$REPLY" !=  y ]  && [ "$REPLY" != Y ]; } && { echo "Aborting..."; exit 1; }
fi


# Copy relevant files to BeagleBone Black
printf "Copying new IDE files to BeagleBone..."
[ -z $USE_RSYNC ] && { [ -z "`which rsync`" ] && USE_RSYNC=0 || USE_RSYNC=1; }

if [ $USE_RSYNC -eq 1 ]
then
  printf "using rsync..."
  rsync -ac --no-t --delete-after $SCRIPTDIR/../IDE $BBB_ADDRESS:$BBB_BELA_HOME
else
  #if rsync is not available, let's clean the folder first
  ssh $BBB_ADDRESS "rm -rf $BBB_BELA_HOME/IDE ; mkdir -p $BBB_BELA_HOME/IDE" || { printf "\nError while removing the old files, is the board connected?\n"; exit 1; }
  printf "using scp...might take a while ..."
  scp -rq $SCRIPTDIR/../IDE $BBB_ADDRESS:$BBB_BELA_HOME
fi
[ $? -eq 0 ] &&\
printf "done\n" || { printf "\nError while copying files: error $?\n"; exit 1; }

# Make sure the projects folder exists and there is a project in it
ssh $BBB_ADDRESS "cd $BBB_BELA_HOME/; mkdir -p $BBB_BELA_HOME/IDE/public/media; mkdir -p projects/; [ -d projects/basic ] || cp -r examples/basic projects/" &&\

# If there are any C/C++ files, rebuild node dependencies
find $SCRIPTDIR/../IDE | grep '\(\.cpp\|\.cc\|\.c\|\.hpp\|\.hh\|\.h\)$' >/dev/null 2>&1 &&\
{ 
	printf "Rebuilding node dependencies..."
	ssh $BBB_ADDRESS "cd $BBB_BELA_HOME/IDE/; npm rebuild &>/dev/null" &&\
	printf "done\n" || { printf "\nError while rebuilding dependencies.\n"; exit 1; }
}

echo "The IDE was correctly updated"
