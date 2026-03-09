cmake_minimum_required(VERSION 3.15)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
project(code-engine)

if(DEFINED ENV{ARQON_MAESTRO_SOURCE_ROOT})
  set(SERENADE_SOURCE_ROOT $ENV{ARQON_MAESTRO_SOURCE_ROOT})
elseif(DEFINED ENV{SERENADE_SOURCE_ROOT})
  set(SERENADE_SOURCE_ROOT $ENV{SERENADE_SOURCE_ROOT})
else()
  get_filename_component(SERENADE_SOURCE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../.." ABSOLUTE)
endif()

if(DEFINED ENV{ARQON_MAESTRO_LIBRARY_ROOT})
  set(SERENADE_LIBRARY_ROOT $ENV{ARQON_MAESTRO_LIBRARY_ROOT})
elseif(DEFINED ENV{SERENADE_LIBRARY_ROOT})
  set(SERENADE_LIBRARY_ROOT $ENV{SERENADE_LIBRARY_ROOT})
else()
  if(EXISTS "$ENV{HOME}/libarqon")
    set(SERENADE_LIBRARY_ROOT $ENV{HOME}/libarqon)
  else()
    set(SERENADE_LIBRARY_ROOT $ENV{HOME}/libserenade)
  endif()
endif()

if(DEFINED ENV{ARQON_MAESTRO_PROTOBUF_ROOT})
  set(SERENADE_PROTOBUF_ROOT $ENV{ARQON_MAESTRO_PROTOBUF_ROOT})
elseif(DEFINED ENV{SERENADE_PROTOBUF_ROOT})
  set(SERENADE_PROTOBUF_ROOT $ENV{SERENADE_PROTOBUF_ROOT})
elseif(DEFINED ENV{CONDA_PREFIX} AND EXISTS "$ENV{CONDA_PREFIX}/include/google/protobuf")
  set(SERENADE_PROTOBUF_ROOT $ENV{CONDA_PREFIX})
else()
  set(SERENADE_PROTOBUF_ROOT ${SERENADE_LIBRARY_ROOT}/protobuf)
endif()

if(DEFINED ENV{ARQON_MAESTRO_PROTOC_EXECUTABLE})
  set(SERENADE_PROTOC_EXECUTABLE $ENV{ARQON_MAESTRO_PROTOC_EXECUTABLE})
elseif(DEFINED ENV{SERENADE_PROTOC_EXECUTABLE})
  set(SERENADE_PROTOC_EXECUTABLE $ENV{SERENADE_PROTOC_EXECUTABLE})
elseif(EXISTS "${SERENADE_PROTOBUF_ROOT}/bin/protoc")
  set(SERENADE_PROTOC_EXECUTABLE "${SERENADE_PROTOBUF_ROOT}/bin/protoc")
elseif(EXISTS "$ENV{HOME}/.local/bin/protoc")
  set(SERENADE_PROTOC_EXECUTABLE "$ENV{HOME}/.local/bin/protoc")
else()
  set(SERENADE_PROTOC_EXECUTABLE "protoc")
endif()

if(DEFINED ENV{ARQON_MAESTRO_LINEAR_ALGEBRA_BACKEND})
  set(SERENADE_LINEAR_ALGEBRA_BACKEND $ENV{ARQON_MAESTRO_LINEAR_ALGEBRA_BACKEND})
elseif(DEFINED ENV{SERENADE_LINEAR_ALGEBRA_BACKEND})
  set(SERENADE_LINEAR_ALGEBRA_BACKEND $ENV{SERENADE_LINEAR_ALGEBRA_BACKEND})
elseif(EXISTS "/opt/intel/mkl/lib/intel64/libmkl_core.a")
  set(SERENADE_LINEAR_ALGEBRA_BACKEND "MKL")
else()
  set(SERENADE_LINEAR_ALGEBRA_BACKEND "OPENBLAS")
endif()

if(DEFINED ENV{ARQON_MAESTRO_MKL_ROOT})
  set(SERENADE_MKL_ROOT $ENV{ARQON_MAESTRO_MKL_ROOT})
elseif(DEFINED ENV{SERENADE_MKL_ROOT})
  set(SERENADE_MKL_ROOT $ENV{SERENADE_MKL_ROOT})
else()
  set(SERENADE_MKL_ROOT "/opt/intel/mkl")
endif()

if(DEFINED ENV{ARQON_MAESTRO_OPENBLAS_LIBRARY})
  set(SERENADE_OPENBLAS_LIBRARY $ENV{ARQON_MAESTRO_OPENBLAS_LIBRARY})
elseif(DEFINED ENV{SERENADE_OPENBLAS_LIBRARY})
  set(SERENADE_OPENBLAS_LIBRARY $ENV{SERENADE_OPENBLAS_LIBRARY})
else()
  set(SERENADE_OPENBLAS_LIBRARY "openblas")
endif()

set(MARIAN_ROOT ${SERENADE_LIBRARY_ROOT}/marian)
set(MARIAN_NATIVE_ROOT ${SERENADE_LIBRARY_ROOT}/marian-native)

add_compile_options(
  -Wall
  -Wno-sign-compare
  -Wno-unused-value
  -Wno-unknown-pragmas
  -Wno-uninitialized
  -pthread
  -O3
)

if(APPLE)
  set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0")
  add_compile_options(
    -Wno-deprecated-register
    -Wno-unneeded-internal-declaration
  )
endif()

list(APPEND CMAKE_PREFIX_PATH ${SERENADE_PROTOBUF_ROOT})
list(APPEND CMAKE_PREFIX_PATH ${SERENADE_PROTOBUF_ROOT}/lib/cmake)
set(Protobuf_ROOT ${SERENADE_PROTOBUF_ROOT})
set(Protobuf_PROTOC_EXECUTABLE ${SERENADE_PROTOC_EXECUTABLE})
set(Protobuf_INCLUDE_DIR ${SERENADE_PROTOBUF_ROOT}/include)
set(protobuf_MODULE_COMPATIBLE TRUE)
set(CMAKE_MODULE_PATH "${MARIAN_ROOT}/cmake" ${CMAKE_MODULE_PATH})
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/code-engine)
set(BUILD_SHARED_LIBS FALSE)
if(APPLE)
  set(BUILD_ARCH "x86-64")
  set(CMAKE_OSX_ARCHITECTURES "x86_64")
endif()

if(APPLE)
  include(FindIconv)
  include_directories(Iconv_INCLUDE_DIRS)
endif()

find_package(Threads)
set(Boost_USE_STATIC_LIBS ON)
set(Boost_USE_MULTITHREADED ON)
set(Boost_USE_STATIC_RUNTIME OFF)
find_package(Boost 1.78.0 COMPONENTS regex system thread PATHS ${SERENADE_LIBRARY_ROOT}/boost)
include_directories(${Boost_INCLUDE_DIRS})

find_package(Protobuf CONFIG REQUIRED)
# Keep frozen protobuf headers ahead of Marian's vendored 3rd_party includes.
include_directories(BEFORE ${SERENADE_PROTOBUF_ROOT}/include)
include_directories(BEFORE ${Protobuf_INCLUDE_DIRS})
include_directories(${Protobuf_INCLUDE_DIR})
include_directories(${CMAKE_CURRENT_BINARY_DIR})
set(PROTOS
  ${SERENADE_SOURCE_ROOT}/toolbelt/src/main/proto/code-engine.proto
  ${SERENADE_SOURCE_ROOT}/toolbelt/src/main/proto/core.proto
)
protobuf_generate_cpp(PROTO_SRCS PROTO_HEADERS ${PROTOS})
add_library(code-engine_protobuf ${PROTO_HEADERS} ${PROTO_SRCS})

include_directories(${SERENADE_LIBRARY_ROOT}/crow/include)
include_directories(
  ${MARIAN_ROOT}/src
  ${MARIAN_ROOT}/src/3rd_party
)

set(SENTENCEPIECE_ROOT ${SERENADE_LIBRARY_ROOT}/sentencepiece)

include_directories(include)
include_directories(${SERENADE_SOURCE_ROOT}/toolbelt/src/main/cpp/include)
file(GLOB SOURCES src/*.cc src/*/*.cc)
add_executable(arqon-maestro-code-engine ${SOURCES} server/code_engine_server.cc)
target_include_directories(code-engine_protobuf BEFORE PRIVATE ${SERENADE_PROTOBUF_ROOT}/include)
target_include_directories(arqon-maestro-code-engine BEFORE PRIVATE ${SERENADE_PROTOBUF_ROOT}/include)
target_compile_definitions(arqon-maestro-code-engine PRIVATE _USE_TF_STRING_VIEW)
target_link_libraries(arqon-maestro-code-engine
  code-engine_protobuf
  pthread
  protobuf::libprotobuf
  ${Boost_LIBRARIES}
)

if(DEFINED ENV{SERENADE_NATIVE})
  target_link_libraries(arqon-maestro-code-engine ${MARIAN_NATIVE_ROOT}/build/libmarian.a)
else()
  target_link_libraries(arqon-maestro-code-engine ${MARIAN_ROOT}/build/libmarian.a)
endif()

target_link_libraries(arqon-maestro-code-engine
  ${SENTENCEPIECE_ROOT}/lib/libsentencepiece.so
  ${SENTENCEPIECE_ROOT}/lib/libsentencepiece_train.so
)

if(APPLE)
  target_link_libraries(arqon-maestro-code-engine
    ${Iconv_LIBRARIES}
    "-framework Accelerate"
  )
else()
  if(SERENADE_LINEAR_ALGEBRA_BACKEND STREQUAL "MKL")
    target_link_libraries(arqon-maestro-code-engine
      "-Wl,--start-group;${SERENADE_MKL_ROOT}/lib/intel64/libmkl_intel_ilp64.a;${SERENADE_MKL_ROOT}/lib/intel64/libmkl_sequential.a;${SERENADE_MKL_ROOT}/lib/intel64/libmkl_core.a;-Wl,--end-group"
      dl
      gomp
    )
  else()
    target_link_libraries(arqon-maestro-code-engine
      ${SERENADE_OPENBLAS_LIBRARY}
      dl
      gomp
    )
  endif()
  add_executable(config-generator config-generator/config_generator.cc)
  target_include_directories(config-generator BEFORE PRIVATE ${SERENADE_PROTOBUF_ROOT}/include)
  target_link_libraries(config-generator ${MARIAN_ROOT}/build/libmarian.a)
  if(SERENADE_LINEAR_ALGEBRA_BACKEND STREQUAL "MKL")
    target_link_libraries(config-generator
      "-Wl,--start-group;${SERENADE_MKL_ROOT}/lib/intel64/libmkl_intel_ilp64.a;${SERENADE_MKL_ROOT}/lib/intel64/libmkl_sequential.a;${SERENADE_MKL_ROOT}/lib/intel64/libmkl_core.a;-Wl,--end-group"
      dl
      gomp
    )
  else()
    target_link_libraries(config-generator
      ${SERENADE_OPENBLAS_LIBRARY}
      dl
      gomp
    )
  endif()
endif()
