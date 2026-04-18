export function successResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(message: string, errors?: any) {
  return {
    success: false,
    message,
    errors,
  };
}
