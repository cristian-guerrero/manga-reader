// cmd/onnx-runner/main.cpp
// Minimal ONNX Runtime inference runner.
// Usage: onnx-runner --model model.onnx --input image.ppm [--output result.json]
#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <cstdint>
#include <onnxruntime_cxx_api.h>

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
    f.get();
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
        std::cerr << R"({"error":"Usage: onnx-runner --model model.onnx --input image.ppm"})" << std::endl;
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
        size_t input_c = input_shape[1];

        Ort::AllocatorWithDefaultOptions allocator;

        // Get input/output names
        auto input_names = session.GetInputNames(allocator);
        auto output_names = session.GetOutputNames(allocator);
        auto alloc = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);

        // Load and preprocess image
        Image img = load_ppm(input_path);
        std::vector<float> input(1 * input_c * input_h * input_w);
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

        // Create input tensor
        Ort::Value input_tensor = Ort::Value::CreateTensor<float>(
            alloc, input.data(), input.size(),
            input_shape.data(), input_shape.size()
        );
        // Prepare input/output name arrays (stable pointers, not temporaries)
        const char* in_names[] = {input_names[0].c_str()};
        const char* out_names[] = {output_names[0].c_str()};

        // Run inference
        Ort::RunOptions run_opts;
        auto output_tensors = session.Run(run_opts, in_names, &input_tensor, 1,
                                          out_names, 1);

        // Get output data
        float* output_data = output_tensors[0].GetTensorMutableData();
        auto out_shape = output_tensors[0].GetTensorTypeAndShapeInfo().GetShape();
        size_t out_size = 1;
        for (auto d : out_shape) out_size *= d;

        // Output JSON
        std::string json = R"({"success":true,"shape":[)";
        for (size_t i = 0; i < out_shape.size(); i++) {
            if (i > 0) json += ",";
            json += std::to_string(out_shape[i]);
        }
        json += R"(],"data":[)";
        size_t max_items = std::min(out_size, size_t(8400 * 6));
        for (size_t i = 0; i < max_items; i++) {
            if (i > 0) json += ",";
            json += std::to_string(output_data[i]);
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
