// cmd/onnx-runner/main.cpp
// Minimal ONNX Runtime inference runner.
// Usage: onnx-runner --model model.onnx --input image.png --output result.json
//
// Compile with: cl /EHsc /I onnxruntime/include main.cpp onnxruntime/lib/onnxruntime.lib

#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <cstdint>
#include <onnxruntime_cxx_api.h>

// Simple image loader (NetPBM PPM format)
struct Image {
    int w, h, c;
    std::vector<float> data;
};

Image load_ppm(const std::string& path) {
    std::ifstream f(path, std::ios::binary);
    std::string magic;
    f >> magic;
    if (magic != "P6") throw std::runtime_error("only P6 PPM supported");
    int maxval;
    Image img;
    f >> img.w >> img.h >> maxval;
    f.get(); // skip newline
    std::vector<uint8_t> raw(img.w * img.h * 3);
    f.read((char*)raw.data(), raw.size());
    img.c = 3;
    img.data.resize(img.w * img.h * 3);
    for (size_t i = 0; i < raw.size(); i++)
        img.data[i] = raw[i] / 255.0f;
    return img;
}

int main(int argc, char** argv) {
    std::string model_path, input_path, output_path;

    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--model" && i + 1 < argc) model_path = argv[++i];
        else if (arg == "--input" && i + 1 < argc) input_path = argv[++i];
        else if (arg == "--output" && i + 1 < argc) output_path = argv[++i];
    }

    if (model_path.empty() || input_path.empty()) {
        std::cerr << R"({"error":"Usage: onnx-runner --model model.onnx --input image.ppm [--output result.json]"})" << std::endl;
        return 1;
    }

    try {
        Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "onnx-runner");
        Ort::SessionOptions opts;
        opts.SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_ENABLE_ALL);

        Ort::Session session(env, model_path.c_str(), opts);
        auto input_info = session.GetInputTypeInfo(0);
        auto input_shape = input_info.GetTensorTypeAndShapeInfo().GetShape();
        size_t input_h = input_shape[2];
        size_t input_w = input_shape[3];

        // Load and preprocess image
        Image img = load_ppm(input_path);
        std::vector<float> input(1 * 3 * input_h * input_w);
        for (size_t y = 0; y < input_h; y++) {
            for (size_t x = 0; x < input_w; x++) {
                size_t sx = x * img.w / input_w;
                size_t sy = y * img.h / input_h;
                size_t si = (sy * img.w + sx) * 3;
                size_t di = y * input_w + x;
                input[0 * input_h * input_w + di] = img.data[si + 0];
                input[1 * input_h * input_w + di] = img.data[si + 1];
                input[2 * input_h * input_w + di] = img.data[si + 2];
            }
        }

        // Run inference
        auto memory_info = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
        Ort::Value input_tensor = Ort::Value::CreateTensor<float>(
            memory_info, input.data(), input.size(),
            input_shape.data(), input_shape.size()
        );

        auto output_tensors = session.Run(Ort::RunOptions{nullptr},
            {session.GetInputName(0).get()}, {&input_tensor}, 1,
            {session.GetOutputName(0).get()}, 1
        );

        // Get output
        auto* output = output_tensors[0].GetTensorMutableData<float>();
        auto output_shape = output_tensors[0].GetTensorTypeAndShapeInfo().GetShape();
        size_t output_size = 1;
        for (auto d : output_shape) output_size *= d;

        // Output as JSON
        std::string json = R"({"success":true,"shape":[)";
        for (size_t i = 0; i < output_shape.size(); i++) {
            if (i > 0) json += ",";
            json += std::to_string(output_shape[i]);
        }
        json += R"(],"data":[)";
        size_t max_items = std::min(output_size, size_t(100));
        for (size_t i = 0; i < max_items; i++) {
            if (i > 0) json += ",";
            json += std::to_string(output[i]);
        }
        json += "]}";

        if (!output_path.empty()) {
            std::ofstream of(output_path);
            of << json;
        } else {
            std::cout << json << std::endl;
        }

    } catch (const std::exception& e) {
        std::cerr << R"({"error":")" << e.what() << R"("})" << std::endl;
        return 1;
    }

    return 0;
}
