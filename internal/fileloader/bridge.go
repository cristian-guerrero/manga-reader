package fileloader

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"strings"
)

// APICallRequest is the JSON body for /api/call requests.
type APICallRequest struct {
	Method string        `json:"method"`
	Args   []interface{} `json:"args"`
}

// APICallResponse is the JSON response for /api/call requests.
type APICallResponse struct {
	Result interface{} `json:"result,omitempty"`
	Error  string      `json:"error,omitempty"`
}

// NewBridgeHandler creates an HTTP handler that routes /api/call requests
// to methods on the provided app object using reflection.
// Always returns HTTP 200 with {result, error} format, matching Wails behavior.
func NewBridgeHandler(app any) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeAPIResponse(w, nil, "Method not allowed")
			return
		}

		var req APICallRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAPIResponse(w, nil, "Invalid request body: "+err.Error())
			return
		}

		result, err := callMethod(app, req.Method, req.Args)
		if err != nil {
			writeAPIResponse(w, nil, err.Error())
			return
		}

		writeAPIResponse(w, result, "")
	})
}

// callMethod invokes the named method on the app object with the given arguments.
func callMethod(app any, methodName string, args []interface{}) (interface{}, error) {
	val := reflect.ValueOf(app)

	// DO NOT dereference pointer. Methods with pointer receivers are only
	// available on the pointer type itself.
	// If app is *App, val.MethodByName works.
	// If app is App (value), only value-receiver methods are available.

	method := val.MethodByName(methodName)
	if !method.IsValid() {
		var available []string
		for i := 0; i < val.NumMethod(); i++ {
			available = append(available, val.Type().Method(i).Name)
		}
		return nil, fmt.Errorf("method %s not found (available: %s)", methodName, strings.Join(available[:min(10, len(available))], ", "))
	}

	methodType := method.Type()
	numIn := methodType.NumIn()

	// Build argument list
	in := make([]reflect.Value, numIn)

	// Try to get the ctx field from App struct (for methods that need it)
	var ctxVal reflect.Value
	if val.Kind() == reflect.Ptr {
		ctxField := val.Elem().FieldByName("ctx")
		if ctxField.IsValid() {
			ctxVal = ctxField
		}
	} else {
		ctxField := val.FieldByName("ctx")
		if ctxField.IsValid() {
			ctxVal = ctxField
		}
	}

	argIdx := 0
	for i := 0; i < numIn; i++ {
		paramType := methodType.In(i)

		// Check if this parameter is context.Context
		if paramType.String() == "context.Context" {
			if ctxVal.IsValid() {
				in[i] = ctxVal
			} else {
				in[i] = reflect.Zero(paramType)
			}
			continue
		}

		// Match remaining args
		if argIdx >= len(args) {
			in[i] = reflect.Zero(paramType)
			continue
		}

		argVal, err := convertArg(args[argIdx], paramType)
		if err != nil {
			return nil, fmt.Errorf("arg %d (%s): %v", argIdx, paramType, err)
		}
		in[i] = argVal
		argIdx++
	}

	// Call the method
	results := method.Call(in)

	// Handle return values
	if len(results) == 0 {
		return nil, nil
	}

	// Check last result for error
	lastResult := results[len(results)-1]
	if lastResult.Type().String() == "error" && !lastResult.IsNil() {
		return nil, lastResult.Interface().(error)
	}

	// Return first result if there is one and it's not an error
	if len(results) > 0 && results[0].Type().String() != "error" {
		return results[0].Interface(), nil
	}

	return nil, nil
}

// convertArg converts a JSON argument to the expected Go type.
func convertArg(arg interface{}, targetType reflect.Type) (reflect.Value, error) {
	if arg == nil {
		return reflect.Zero(targetType), nil
	}

	switch targetType.Kind() {
	case reflect.String:
		if s, ok := arg.(string); ok {
			return reflect.ValueOf(s), nil
		}
		return reflect.ValueOf(fmt.Sprintf("%v", arg)), nil

	case reflect.Bool:
		if b, ok := arg.(bool); ok {
			return reflect.ValueOf(b), nil
		}
		return reflect.ValueOf(false), fmt.Errorf("expected bool, got %T", arg)

	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		switch v := arg.(type) {
		case float64:
			return reflect.ValueOf(int64(v)).Convert(targetType), nil
		case int:
			return reflect.ValueOf(v).Convert(targetType), nil
		case int64:
			return reflect.ValueOf(v).Convert(targetType), nil
		}
		return reflect.Zero(targetType), fmt.Errorf("expected int, got %T", arg)

	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		switch v := arg.(type) {
		case float64:
			return reflect.ValueOf(uint64(v)).Convert(targetType), nil
		case int:
			return reflect.ValueOf(uint64(v)).Convert(targetType), nil
		}
		return reflect.Zero(targetType), fmt.Errorf("expected uint, got %T", arg)

	case reflect.Float32, reflect.Float64:
		if f, ok := arg.(float64); ok {
			return reflect.ValueOf(f).Convert(targetType), nil
		}
		return reflect.Zero(targetType), fmt.Errorf("expected float, got %T", arg)

	case reflect.Slice:
		if arr, ok := arg.([]interface{}); ok {
			slice := reflect.MakeSlice(targetType, len(arr), len(arr))
			elemType := targetType.Elem()
			for i, item := range arr {
				val, err := convertArg(item, elemType)
				if err != nil {
					return reflect.Zero(targetType), fmt.Errorf("slice element %d: %v", i, err)
				}
				slice.Index(i).Set(val)
			}
			return slice, nil
		}
		return reflect.ValueOf(arg).Convert(targetType), nil

	case reflect.Map:
		if m, ok := arg.(map[string]interface{}); ok {
			mapVal := reflect.MakeMap(targetType)
			elemType := targetType.Elem()
			for k, v := range m {
				val, err := convertArg(v, elemType)
				if err != nil {
					return reflect.Zero(targetType), fmt.Errorf("map key %q: %v", k, err)
				}
				mapVal.SetMapIndex(reflect.ValueOf(k), val)
			}
			return mapVal, nil
		}
		return reflect.ValueOf(arg).Convert(targetType), nil

	case reflect.Struct:
		if m, ok := arg.(map[string]interface{}); ok {
			jsonBytes, err := json.Marshal(m)
			if err != nil {
				return reflect.Zero(targetType), fmt.Errorf("marshal struct: %v", err)
			}
			ptr := reflect.New(targetType)
			if err := json.Unmarshal(jsonBytes, ptr.Interface()); err != nil {
				return reflect.Zero(targetType), fmt.Errorf("unmarshal struct %s: %v", targetType, err)
			}
			return ptr.Elem(), nil
		}
		return reflect.Zero(targetType), fmt.Errorf("expected map for struct, got %T", arg)

	case reflect.Ptr:
		if targetType.Elem().Kind() == reflect.Struct {
			if arg == nil {
				return reflect.Zero(targetType), nil
			}
			elemVal, err := convertArg(arg, targetType.Elem())
			if err != nil {
				return reflect.Zero(targetType), err
			}
			ptr := reflect.New(targetType.Elem())
			ptr.Elem().Set(elemVal)
			return ptr, nil
		}
		return reflect.Zero(targetType), fmt.Errorf("unsupported pointer type: %s", targetType)

	case reflect.Interface:
		return reflect.ValueOf(arg), nil

	default:
		return reflect.Zero(targetType), fmt.Errorf("unsupported type: %s", targetType)
	}
}

// writeAPIResponse writes a JSON response with result or error.
// Always returns HTTP 200, matching Wails behavior.
func writeAPIResponse(w http.ResponseWriter, result interface{}, errMsg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(APICallResponse{Result: result, Error: errMsg})
}
