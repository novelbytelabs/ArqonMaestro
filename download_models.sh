#!/bin/bash
# Maestro Model Downloader
# Downloads Arqon Maestro model assets from the inherited CDN for local/offline use

set -e

BASE_URL="https://serenadecdn.com/models"
MODEL_DIR="${ARQON_MAESTRO_LIBRARY_ROOT:-${SERENADE_LIBRARY_ROOT:-$HOME/libarqon}}/models"

mkdir -p "$MODEL_DIR"

echo "=== Maestro Model Downloader ==="
echo "Downloading to: $MODEL_DIR"
echo ""

# Speech Engine Models
echo "--- Speech Engine Models ---"

mkdir -p "$MODEL_DIR/speech-engine/acoustic-model"
curl -L -o "$MODEL_DIR/speech-engine/acoustic-model/c4dd4b49e0878c769bfac87932097a6d5bff125e.tar.gz" \
  "$BASE_URL/speech-engine/acoustic-model/c4dd4b49e0878c769bfac87932097a6d5bff125e.tar.gz" &
echo "Downloading: acoustic-model (~110MB)"

mkdir -p "$MODEL_DIR/speech-engine/export"
curl -L -o "$MODEL_DIR/speech-engine/export/1bc10fbb97397f19fb8081efcc6e89bc2d954855.tar.gz" \
  "$BASE_URL/speech-engine/export/1bc10fbb97397f19fb8081efcc6e89bc2d954855.tar.gz" &
echo "Downloading: speech-engine export (~279MB)"

mkdir -p "$MODEL_DIR/speech-engine/g2p"
curl -L -o "$MODEL_DIR/speech-engine/g2p/154f45a7fe0bf4143d0005a3145d59dada35c979.tar.gz" \
  "$BASE_URL/speech-engine/g2p/154f45a7fe0bf4143d0005a3145d59dada35c979.tar.gz" &
echo "Downloading: g2p model"

mkdir -p "$MODEL_DIR/speech-engine/user-language-model"
curl -L -o "$MODEL_DIR/speech-engine/user-language-model/4f83810ae9cfa82f04620ee4e51c98b0ad263215.tar.gz" \
  "$BASE_URL/speech-engine/user-language-model/4f83810ae9cfa82f04620ee4e51c98b0ad263215.tar.gz" &
echo "Downloading: user-language-model"

wait
echo "Speech engine models downloaded!"
echo ""

# Code Engine Models
echo "--- Code Engine Models ---"

# Transcript Parser
mkdir -p "$MODEL_DIR/code-engine/export/transcript-parser"
curl -L -o "$MODEL_DIR/code-engine/export/transcript-parser/49ad67972c0f7b526b008999efbbccf4f46d11d4.tar.gz" \
  "$BASE_URL/code-engine/export/transcript-parser/49ad67972c0f7b526b008999efbbccf4f46d11d4.tar.gz" &
echo "Downloading: transcript-parser (default)"

# Auto-style models for all languages
LANGUAGES="bash cplusplus csharp dart default go html java javascript kotlin python ruby rust scss"

for lang in $LANGUAGES; do
  mkdir -p "$MODEL_DIR/code-engine/export/auto-style/$lang"
  
  # Get hash from models.yaml mapping
  case $lang in
    bash) hash="f1f0fd4cf42f75c8ac8944989c8b6302c09e802c" ;;
    cplusplus) hash="c4138ed6c15e8ccc4176bca64c663eb1cc5e6cb8" ;;
    csharp) hash="3fbebb2452ee2ab907e553900b2c4ff26d7556e6" ;;
    dart) hash="5b17fdca220ffb7eecdc2b81d0a5dc33f7f60193" ;;
    default) hash="4a3e90ce3a422969ba96e207a20052a21295e7fd" ;;
    go) hash="ade02f7bc6cebad81327e49972aa78dbbaf6905d" ;;
    html) hash="55861bef7eb6726392fe0e669694bc085c95b756" ;;
    java) hash="11fee267d456ac63b5eae90752763e22f99a6810" ;;
    javascript) hash="fc3c762818ad762a93f1df209f5cdb9ff1c07dd1" ;;
    kotlin) hash="27071892bf7229e8dc1837b02f4977812b9acc54" ;;
    python) hash="41a2625276cb375a7c5d1f4d9e40a600ef1b5245" ;;
    ruby) hash="e9c09294c142f4259111eb48d53d991d0088fa6a" ;;
    rust) hash="6cdc0dcb045f91b765dc47832e7e375695e8904f" ;;
    scss) hash="7c403470c720223160bf1c0d6e0fb7d4ccae6aa5" ;;
  esac
  
  curl -L -o "$MODEL_DIR/code-engine/export/auto-style/$lang/$hash.tar.gz" \
    "$BASE_URL/code-engine/export/auto-style/$lang/$hash.tar.gz" &
  echo "Downloading: auto-style/$lang"
done

# Contextual language models for all languages
for lang in $LANGUAGES; do
  mkdir -p "$MODEL_DIR/code-engine/export/contextual-language-model/$lang"
  
  # Get hash from models.yaml mapping
  case $lang in
    bash) hash="ad2fe49dcb6d95a2d8347f18bfd487f3513e49ea" ;;
    cplusplus) hash="d3e293eaeca0176425535d5e7fd4206111e21539" ;;
    csharp) hash="b221664930690d24770831b4c95731c292a97965" ;;
    dart) hash="964ce0c9d21a79cc65318fd2fe0a6f9952934a64" ;;
    default) hash="55ed37b2225d4e06f62be0612d38e1f3c8293dbb" ;;
    go) hash="01e74f2398233578ac1ef38bc285d43482e1893c" ;;
    html) hash="9035c3aa4955d6cdee2ff944b6ef752d70e8302b" ;;
    java) hash="ae61afb574fa9eb5ff721b07af01953474755fdb" ;;
    javascript) hash="03dc7457f3dfedcf7ad2ffaa18f23cf3dafdafc9" ;;
    kotlin) hash="beee9d84fef563c2c584703afe198c289bd52a38" ;;
    python) hash="a34a9668098e476bdd47207c4b407f6453773cf9" ;;
    ruby) hash="55f6ae082c2b62aa7599cc7a66b1d99a005203cb" ;;
    rust) hash="69818f6e2bed6aae82c72c3f59892237e56eeca2" ;;
    scss) hash="c477a36be91c53d4caabaebc55b9835f3a12d90b" ;;
  esac
  
  curl -L -o "$MODEL_DIR/code-engine/export/contextual-language-model/$lang/$hash.tar.gz" \
    "$BASE_URL/code-engine/export/contextual-language-model/$lang/$hash.tar.gz" &
  echo "Downloading: contextual-language-model/$lang"
done

wait
echo ""
echo "=== All models downloaded! ==="
echo "Models are in: $MODEL_DIR"
echo ""
echo "To extract all models, run:"
echo "  find $MODEL_DIR -name '*.tar.gz' -execdir tar -xzf {} \;"
