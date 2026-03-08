#!/bin/bash

if [[ -z "$ARQON_MAESTRO_SOURCE_ROOT" ]] ; then
  ARQON_MAESTRO_SOURCE_ROOT="$HOME/maestro"
fi

if [[ -z "$ARQON_MAESTRO_LIBRARY_ROOT" ]] ; then
  ARQON_MAESTRO_LIBRARY_ROOT="$HOME/libserenade"
fi

mkdir -p $ARQON_MAESTRO_SOURCE_ROOT
mkdir -p $ARQON_MAESTRO_LIBRARY_ROOT

# docker doesn't use sudo
if [[ "$EUID" == 0 ]] ; then
  sudo-non-docker () {
    "$@"
  }
  else
  sudo-non-docker () {
    sudo "$@"
  }
fi
