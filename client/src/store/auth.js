import { reactive, computed } from "vue";

const state = reactive({
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null")
});

function setAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

function updateUser(user) {
  state.user = user;
  localStorage.setItem("user", JSON.stringify(user));
}

function clearAuth() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

const isAuthed = computed(() => !!state.token);
const isAdmin = computed(() => state.user && state.user.role === "admin");

export default function useAuth() {
  return { state, setAuth, updateUser, clearAuth, isAuthed, isAdmin };
}
