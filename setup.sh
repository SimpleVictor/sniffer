echo "Downloading necessary packages for Sniffer"

# websocketDir="/usr/local/lib/python3.6/site-packages/websockets"
websocketDir="/usr/local/opt/python3/Frameworks/Python.framework/Versions/3.6/lib/python3.6/websockets"

# Check for Homebrew, install if we don't have it
if test ! $(which brew)
then
    echo "Installing homebrew..."
    ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
else
    echo "Brew is already in your system"
fi


if test ! $(which mitmproxy)
then
    echo "Installing mitmproxy..."
    pip3 install mitmproxy~=2.0.2
else
    echo "MitmProxy is already in your system"
fi

if test ! $(which pip3)
then
    echo "Installing python version 3..."
    brew install python3
else
    echo "Python3/pip3 is already in your system"
fi

if [ -d "$websocketDir" ]
then
    echo "You already have websockets installed"
else
    echo "Adding websockets in your python collections..."
    mkdir /usr/local/opt/python3/Frameworks/Python.framework/Versions/3.6/lib/python3.6/websockets
    cp -r ./lib/websockets /usr/local/opt/python3/Frameworks/Python.framework/Versions/3.6/lib/python3.6/
    echo "Websocket was added successfully"
fi


#if [ -d "$websocketDir" ]
#then
#    echo "You already installed websockets"
#else
#    echo "Installing websockets now..."
#    echo "If this takes too long then it must mean you're not on visigoth and you didn't turn on proxy"
#    pip3 install websockets
#fi

echo "All done!"
