# --- LIBRERÍAS ---
library(profvis)
library(dplyr)
library(zoo)      # LOCF
library(VIM)      # kNN
library(mice)     # Imputación múltiple
library(bench)    # Tiempos/memoria

# --- CARGAR CSV ---
clientes <- read.csv("D:/C_EPG/2025_II/C4/clii.csv", 
                     stringsAsFactors = FALSE, 
                     sep = ";", 
                     header = TRUE)

# --- SIMULAR NAs EN TELEFONO ---
set.seed(123)
clientes$telefono <- as.character(clientes$telefono)
idx <- sample(1:nrow(clientes), size = round(0.05*nrow(clientes))) # 5% NAs
clientes$telefono[idx] <- NA

# --- FUNCIONES DE IMPUTACIÓN ---

# 1. Moda
impute_mean_mode <- function(df) {
  Sys.sleep(0.1)
  if(all(is.na(df$telefono))){
    df$telefono[is.na(df$telefono)] <- "SIN_DATOS"
  } else {
    moda <- names(sort(table(df$telefono), decreasing = TRUE))[1]
    df$telefono[is.na(df$telefono)] <- moda
  }
  if(all(is.na(df$departamento))){
    df$departamento[is.na(df$departamento)] <- "SIN_DATOS"
  } else {
    moda_dep <- names(sort(table(df$departamento), decreasing = TRUE))[1]
    df$departamento[is.na(df$departamento)] <- moda_dep
  }
  return(df)
}

# 2. Aleatoria
impute_random <- function(df) {
  Sys.sleep(0.1)
  na_idx <- which(is.na(df$telefono))
  if (length(na_idx) > 0) {
    df$telefono[na_idx] <- sample(na.omit(df$telefono), length(na_idx), replace = TRUE)
  }
  return(df)
}

# 3. LOCF
impute_locf <- function(df) {
  Sys.sleep(0.1)
  df$telefono <- zoo::na.locf(df$telefono, na.rm = FALSE)
  return(df)
}

# 4. kNN
impute_knn <- function(df) {
  Sys.sleep(0.1)
  df_knn <- VIM::kNN(df, variable = "telefono", k = 5)
  return(df_knn)
}

# 5. MICE
impute_mice <- function(df) {
  Sys.sleep(0.1)
  df_mice <- df %>% dplyr::select(id_cliente, telefono, departamento, tipo_cliente, estado_cliente)
  imp <- mice(df_mice, m = 1, maxit = 3, method = 'pmm', seed = 123, printFlag = FALSE)
  df_mice <- complete(imp)
  return(df_mice)
}

# --- PERFIL VISUAL ---
profvis({
  clientes1 <- impute_mean_mode(clientes)
  clientes2 <- impute_random(clientes)
  clientes3 <- impute_locf(clientes)
  clientes4 <- impute_knn(clientes)
  clientes5 <- impute_mice(clientes)
})

# --- FUNCION SEGURA ---
safe_run <- function(fun, df){
  tryCatch(fun(df), error = function(e){
    message("⚠️ Error en ", deparse(substitute(fun)), ": ", e$message)
    return(df)
  })
}

# --- BENCHMARK ---
resultados <- bench::mark(
  mean_mode = safe_run(impute_mean_mode, clientes),
  random    = safe_run(impute_random, clientes),
  locf      = safe_run(impute_locf, clientes),
  knn       = safe_run(impute_knn, clientes),
  mice      = safe_run(impute_mice, clientes),
  iterations = 3,
  check = FALSE
)

# --- ORDENAR Y LIMPIAR RESULTADOS ---
resultados_ordenados <- resultados %>%
  as.data.frame() %>%
  mutate(
    median_sec = as.numeric(median),          # convertir a segundos
    mem_alloc_mb = as.numeric(mem_alloc) / 1e6  # convertir a MB
  ) %>%
  arrange(median_sec) %>%
  select(expression, median_sec, mem_alloc_mb, n_gc)

# Mostrar resultados en consola
print(resultados_ordenados)

# --- EXPORTAR ---
write.csv(resultados_ordenados, 
          "D:/C_EPG/2025_II/C4/resultados_imputacion.csv", 
          row.names = FALSE)
