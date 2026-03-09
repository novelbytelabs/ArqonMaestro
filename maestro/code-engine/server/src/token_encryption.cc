#include <boost/algorithm/string.hpp>

#include <cerrno>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <sys/wait.h>
#include <unistd.h>
#include <vector>

#include "io.h"
#include "token_encryption.h"

namespace code_engine {

namespace {

std::string ResolveSentencePieceBinary() {
  const char* env_binary = std::getenv("ARQON_MAESTRO_SPM_ENCODE");
  if (env_binary != nullptr && std::string(env_binary).size() > 0) {
    return std::string(env_binary);
  }

  env_binary = std::getenv("SERENADE_SPM_ENCODE");
  if (env_binary != nullptr && std::string(env_binary).size() > 0) {
    return std::string(env_binary);
  }

  std::vector<std::string> candidates;
  const char* home = std::getenv("HOME");
  if (home != nullptr && std::string(home).size() > 0) {
    candidates.push_back(std::string(home) +
                         "/libarqon/sentencepiece/bin/spm_encode");
    candidates.push_back(std::string(home) +
                         "/libserenade/sentencepiece/bin/spm_encode");
  }
  candidates.push_back("spm_encode");
  for (const std::string& candidate : candidates) {
    if (candidate == "spm_encode" || access(candidate.c_str(), X_OK) == 0) {
      return candidate;
    }
  }

  return "spm_encode";
}

std::string TrimCopy(const std::string& input) {
  const std::string whitespace = " \t\r\n";
  const size_t start = input.find_first_not_of(whitespace);
  if (start == std::string::npos) {
    return "";
  }
  const size_t end = input.find_last_not_of(whitespace);
  return input.substr(start, end - start + 1);
}

}  // namespace

void TokenIdConverter::LoadTokenMaps(const std::string& vocab_filename) {
  std::unique_ptr<std::istream> strm = FileStream(vocab_filename);

  std::string line;
  int token_index = 2;  // Starts at 2 because 0/1 reserved for Marian.
  while (std::getline(*strm, line)) {
    token_to_id_.emplace(line, std::to_string(token_index));
    id_to_token_.emplace(std::to_string(token_index), line);
    token_index++;
  }
}

TokenIdConverter::TokenIdConverter(const std::string& vocab_filename) {
  is_sentencepiece_ = false;
  LoadTokenMaps(vocab_filename);
}

TokenIdConverter::TokenIdConverter(const std::string& vocab_filename,
                                   const std::string& spm_filename) {
  is_sentencepiece_ = true;
  LoadTokenMaps(vocab_filename);
  spm_filename_ = spm_filename;
  spm_encode_binary_ = ResolveSentencePieceBinary();
}

std::string TokenIdConverter::Encode(std::string input) {
  if (is_sentencepiece_) {
    return EncodeWithSentencePieceCli(input);
  }

  std::vector<std::string> tokens;
  boost::split(tokens, input, [](char c) { return c == ' '; });
  std::string result("");
  for (std::string token : tokens) {
    auto id_num = token_to_id_.find(token);
    if (id_num != token_to_id_.end()) {
      result = result += std::string(" ") + id_num->second;
    } else {
      result = result += std::string(" 1");  // Append <unk> value.
    }
  }
  return result;
}

std::string TokenIdConverter::Decode(std::string input) {
  std::vector<std::string> tokens;
  boost::split(tokens, input, [](char c) { return c == ' '; });
  std::string result("");
  for (std::string token : tokens) {
    auto id_num = id_to_token_.find(token);
    if (id_num != id_to_token_.end()) {
      result = result += std::string(" ") + id_num->second;
    } else {
      // The case where the input id doesn't exist in the token list should
      // typically never happen.
      result = result += std::string(" ") + "<UNK>";
    }
  }
  return result;
}

std::string TokenIdConverter::EncodeWithSentencePieceCli(
    const std::string& input) {
  int stdin_pipe[2];
  int stdout_pipe[2];
  if (pipe(stdin_pipe) != 0 || pipe(stdout_pipe) != 0) {
    throw std::runtime_error("Failed to create pipes for spm_encode");
  }

  pid_t pid = fork();
  if (pid < 0) {
    close(stdin_pipe[0]);
    close(stdin_pipe[1]);
    close(stdout_pipe[0]);
    close(stdout_pipe[1]);
    throw std::runtime_error("Failed to fork spm_encode process");
  }

  if (pid == 0) {
    dup2(stdin_pipe[0], STDIN_FILENO);
    dup2(stdout_pipe[1], STDOUT_FILENO);
    close(stdin_pipe[0]);
    close(stdin_pipe[1]);
    close(stdout_pipe[0]);
    close(stdout_pipe[1]);

    const char* argv[] = {spm_encode_binary_.c_str(),
                          "--model",
                          spm_filename_.c_str(),
                          "--output_format=id",
                          nullptr};
    execvp(argv[0], const_cast<char* const*>(argv));
    _exit(127);
  }

  close(stdin_pipe[0]);
  close(stdout_pipe[1]);

  const std::string payload = input + "\n";
  ssize_t write_result = write(stdin_pipe[1], payload.c_str(), payload.size());
  close(stdin_pipe[1]);
  if (write_result < 0) {
    close(stdout_pipe[0]);
    int status = 0;
    waitpid(pid, &status, 0);
    throw std::runtime_error("Failed writing input to spm_encode");
  }

  std::string output;
  char buffer[4096];
  while (true) {
    ssize_t read_result = read(stdout_pipe[0], buffer, sizeof(buffer));
    if (read_result < 0) {
      if (errno == EINTR) {
        continue;
      }
      close(stdout_pipe[0]);
      int status = 0;
      waitpid(pid, &status, 0);
      throw std::runtime_error("Failed reading output from spm_encode");
    }
    if (read_result == 0) {
      break;
    }
    output.append(buffer, read_result);
  }
  close(stdout_pipe[0]);

  int status = 0;
  waitpid(pid, &status, 0);
  if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) {
    throw std::runtime_error("spm_encode exited with non-zero status");
  }

  const std::string trimmed = TrimCopy(output);
  if (trimmed.empty()) {
    return "";
  }
  return std::string(" ") + trimmed;
}

std::vector<std::string> TokenIdConverter::Encode(
    std::vector<std::string> inputs) {
  std::vector<std::string> result;
  for (std::string s : inputs) {
    result.push_back(Encode(s));
  }
  return result;
}

std::vector<std::string> TokenIdConverter::Decode(
    std::vector<std::string> inputs) {
  std::vector<std::string> result;
  for (std::string s : inputs) {
    result.push_back(Decode(s));
  }
  return result;
}

}  // namespace code_engine
